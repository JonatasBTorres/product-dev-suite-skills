# Dados e Bancos de Dados — Referência Backend

## Sumário
1. [PostgreSQL / SQL — Modelagem e Boas Práticas](#sql)
2. [Migrations](#migrations)
3. [MongoDB — NoSQL de documentos](#mongodb)
4. [Redis — Cache e estruturas de dados](#redis)
5. [Cassandra — Escala massiva](#cassandra)
6. [Escolha do banco certa para cada problema](#choosing)

---

## 1. PostgreSQL / SQL {#sql}

### Modelagem relacional — padrões essenciais

```sql
-- Tabela com boas práticas: UUID, timestamps, soft delete, índices
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'user'
                    CHECK (role IN ('admin', 'user', 'viewer')),
    password_hash TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ  -- soft delete
);

-- Índices estratégicos: pense nas queries antes de criar
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active, created_at DESC) WHERE is_active = TRUE;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Relacionamentos e JOINs corretos

```sql
-- Tabela de pedidos com FK bem definida
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status      VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Query com JOIN eficiente (sem N+1)
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.total_cents), 0) AS total_spent_cents
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
WHERE u.is_active = TRUE
  AND u.deleted_at IS NULL
GROUP BY u.id, u.name, u.email
ORDER BY total_spent_cents DESC
LIMIT 50;
```

### Otimização de queries

```sql
-- EXPLAIN ANALYZE: sempre use para queries lentas
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = $1 AND status = 'pending';

-- Detectar queries lentas (habilitar em postgresql.conf)
-- log_min_duration_statement = 1000  (queries > 1s)

-- Índice parcial para queries específicas (mais eficiente que índice total)
CREATE INDEX idx_orders_pending ON orders(user_id, created_at)
WHERE status = 'pending';

-- CTE para queries complexas (legível e otimizável)
WITH active_users AS (
    SELECT id FROM users WHERE is_active = TRUE AND deleted_at IS NULL
),
user_stats AS (
    SELECT user_id, COUNT(*) as order_count
    FROM orders
    WHERE user_id IN (SELECT id FROM active_users)
    GROUP BY user_id
)
SELECT u.name, us.order_count
FROM users u
JOIN user_stats us ON us.user_id = u.id
WHERE us.order_count >= 5;

-- Paginação eficiente com cursor (evitar OFFSET em tabelas grandes)
-- Em vez de: SELECT * FROM orders LIMIT 20 OFFSET 10000  (lento!)
-- Use cursor:
SELECT * FROM orders
WHERE created_at < $last_seen_created_at
   OR (created_at = $last_seen_created_at AND id < $last_seen_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### Transações e ACID

```sql
-- Transação com rollback explícito
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = $sender_id;
UPDATE accounts SET balance = balance + 100 WHERE id = $receiver_id;

-- Verificar se não ficou negativo
DO $$
BEGIN
    IF (SELECT balance FROM accounts WHERE id = $sender_id) < 0 THEN
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;
END $$;

COMMIT;

-- Locking para evitar race condition
SELECT balance FROM accounts WHERE id = $1 FOR UPDATE;
```

---

## 2. Migrations {#migrations}

### Princípios de migrations seguras

```sql
-- ✅ Adicionar coluna com DEFAULT (não-bloqueante no PostgreSQL 11+)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
UPDATE users SET phone = '' WHERE phone IS NULL;
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone SET DEFAULT '';

-- ✅ Criar índice sem bloquear escrita (CONCURRENT)
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);

-- ✅ Renomear: fazer em etapas (deploy-safe)
-- Etapa 1: adicionar nova coluna
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
-- Etapa 2: (em código) escrever em ambas as colunas
-- Etapa 3: migrar dados
UPDATE users SET full_name = name WHERE full_name IS NULL;
-- Etapa 4: próximo deploy — remover coluna antiga
ALTER TABLE users DROP COLUMN name;

-- ❌ NUNCA: DROP COLUMN sem verificar uso em código
-- ❌ NUNCA: ALTER TYPE sem lock controlado
-- ❌ NUNCA: migration sem rollback planejado
```

---

## 3. MongoDB {#mongodb}

### Modelagem de documentos

```javascript
// Schema com Mongoose — validações e índices
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
    profile: {
        avatar: String,
        bio: { type: String, maxlength: 500 },
        location: String
    },
    // Embedding: dados de acesso frequente junto com o documento
    preferences: {
        language: { type: String, default: 'pt-BR' },
        notifications: { type: Boolean, default: true }
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Índices compostos para queries comuns
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'profile.location': 1 });
```

### Embed vs Reference — Regra de decisão

```
Embed quando:
  ✅ Dados acessados sempre juntos (user + preferences)
  ✅ Dados não crescem ilimitados (endereços de um usuário: max ~10)
  ✅ Sem necessidade de acesso independente aos dados aninhados

Reference quando:
  ✅ Dados acessados independentemente (orders separado de users)
  ✅ Dados crescem sem limite (comentários de um post popular)
  ✅ Dados compartilhados entre múltiplos documentos
```

### Aggregation pipeline

```javascript
// Aggregation eficiente — estatísticas de pedidos por usuário
const stats = await Order.aggregate([
    // 1. Filtrar cedo para reduzir documentos no pipeline
    { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: startDate } } },
    // 2. Agrupar
    { $group: {
        _id: '$userId',
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalCents' },
        lastOrderDate: { $max: '$createdAt' }
    }},
    // 3. Join com users (equivalente ao JOIN do SQL)
    { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
    }},
    { $unwind: '$user' },
    // 4. Projetar só o necessário
    { $project: {
        userName: '$user.name',
        orderCount: 1,
        totalRevenue: 1,
        lastOrderDate: 1
    }},
    { $sort: { totalRevenue: -1 } },
    { $limit: 100 }
]);
```

---

## 4. Redis {#redis}

### Padrões de uso

```typescript
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });

// --- Cache aside pattern ---
async function getUserById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;
    
    // 1. Tentar cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // 2. Cache miss: buscar no banco
    const user = await db.users.findById(id);
    if (!user) throw new NotFoundError('User', id);
    
    // 3. Armazenar no cache (TTL: 5 minutos)
    await redis.setEx(cacheKey, 300, JSON.stringify(user));
    return user;
}

// --- Invalidação de cache ---
async function updateUser(id: string, data: UpdateUserData): Promise<User> {
    const user = await db.users.update(id, data);
    // Invalidar cache após update
    await redis.del(`user:${id}`);
    return user;
}

// --- Rate limiting com sliding window ---
async function checkRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowSec * 1000;
    
    const pipeline = redis.multi();
    pipeline.zRemRangeByScore(key, 0, windowStart);
    pipeline.zAdd(key, { score: now, value: `${now}` });
    pipeline.zCard(key);
    pipeline.expire(key, windowSec);
    
    const results = await pipeline.exec();
    const count = results[2] as number;
    return count <= limit;
}

// --- Distributed Lock (evitar race conditions) ---
async function acquireLock(resource: string, ttlMs: number): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const token = crypto.randomUUID();
    // SET NX: só seta se não existir (atômico)
    const acquired = await redis.set(lockKey, token, { NX: true, PX: ttlMs });
    return acquired ? token : null;
}

async function releaseLock(resource: string, token: string): Promise<void> {
    // Script Lua para verificar + deletar atomicamente
    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else return 0 end
    `;
    await redis.eval(script, { keys: [`lock:${resource}`], arguments: [token] });
}
```

---

## 5. Cassandra — Escala massiva {#cassandra}

### Quando Cassandra é a escolha certa (e quando não é)

```
Cassandra resolve um problema específico: escrita distribuída em altíssimo volume,
com disponibilidade que sobrevive à perda de um datacenter inteiro, aceitando
consistência eventual como trade-off. Não é um "Postgres que escala mais".

✅ Use quando: bilhões de writes/dia, múltiplas regiões escrevendo simultaneamente,
   access pattern previsível (você sabe de antemão como vai consultar o dado).
❌ Não use quando: precisa de JOIN, de transação multi-tabela, de consulta ad-hoc
   flexível, ou o volume não justifica a complexidade operacional (a esmagadora
   maioria dos sistemas nunca precisa de fato disso — comece em Postgres).
```

### Modelagem — o inverso do relacional

```
Em Postgres: modele as entidades, normalize, decida os índices depois.
Em Cassandra: modele a PARTIR da query que você vai fazer — uma tabela por
padrão de consulta, com dados desnormalizados/duplicados de propósito.
Não existe "index depois" — se você não modelou pensando na query, a
query vai exigir varredura de cluster inteiro (ineficiente e caro).
```

```sql
-- ❌ Pensar "relacional": 1 tabela normalizada de pedidos, filtrar depois
-- Não funciona bem em Cassandra — filtrar por user_id sem ele ser parte
-- da partition key varre o cluster inteiro.

-- ✅ Pensar "por query": uma tabela desenhada especificamente para
-- "buscar pedidos de um usuário, mais recentes primeiro"
CREATE TABLE orders_by_user (
    user_id UUID,
    created_at TIMESTAMP,
    order_id UUID,
    total_cents BIGINT,
    status TEXT,
    PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
-- user_id = partition key (dados do mesmo usuário ficam no mesmo nó)
-- created_at = clustering key (já vem ordenado por nó, sem sort em runtime)

-- Se você também precisa buscar por status, é OUTRA tabela, com os
-- MESMOS dados duplicados de propósito — desnormalização é o padrão, não o erro
CREATE TABLE orders_by_status (
    status TEXT,
    created_at TIMESTAMP,
    order_id UUID,
    user_id UUID,
    total_cents BIGINT,
    PRIMARY KEY (status, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

### Cliente — escrita e leitura com consistência explícita

```typescript
import { Client, types } from 'cassandra-driver';

const client = new Client({
    contactPoints: ['cassandra-1.internal', 'cassandra-2.internal'],
    localDataCenter: 'datacenter1',
    keyspace: 'orders',
});

// Nível de consistência é escolhido POR QUERY — não existe um "padrão certo" universal
async function createOrder(order: Order): Promise<void> {
    // QUORUM: maioria dos réplicas confirma antes de considerar escrito —
    // bom equilíbrio entre durabilidade e latência para escrita de negócio crítica
    await client.execute(
        `INSERT INTO orders_by_user (user_id, created_at, order_id, total_cents, status)
         VALUES (?, ?, ?, ?, ?)`,
        [order.userId, order.createdAt, order.id, order.totalCents, order.status],
        { consistency: types.consistencies.quorum }
    );

    // Escrever na segunda tabela (denormalizada) — SEM transação entre as duas!
    // Cassandra não tem transação multi-tabela — inconsistência temporária entre
    // as duas visões é uma possibilidade real que a aplicação precisa tolerar
    await client.execute(
        `INSERT INTO orders_by_status (status, created_at, order_id, user_id, total_cents)
         VALUES (?, ?, ?, ?, ?)`,
        [order.status, order.createdAt, order.id, order.userId, order.totalCents],
        { consistency: types.consistencies.quorum }
    );
}

// Leitura: ONE é suficiente para consultas tolerantes a leve staleness (mais rápido)
async function getOrdersByUser(userId: string): Promise<Order[]> {
    const result = await client.execute(
        `SELECT * FROM orders_by_user WHERE user_id = ? LIMIT 50`,
        [userId],
        { consistency: types.consistencies.one }
    );
    return result.rows.map(mapRowToOrder);
}
```

### Antipadrões específicos de Cassandra
- **Modelar como se fosse relacional** (1 tabela normalizada, JOIN em runtime) — Cassandra não tem JOIN; o resultado é sempre uma varredura ineficiente ou múltiplas queries manuais.
- **Partition key de baixa cardinalidade** (ex: `status` sozinho como partition key de uma tabela com poucos status possíveis) — concentra todos os dados em pouquíssimos nós ("hot partition"), perdendo a distribuição que é a razão de usar Cassandra.
- **Esperar transação multi-tabela** — cada tabela desnormalizada é escrita separadamente; a aplicação precisa tolerar (ou reconciliar) inconsistência temporária entre as visões.
- **`ALLOW FILTERING` em produção** — força varredura de partições que não usam a partition key eficientemente; quase sempre sinal de que o modelo de dados está errado para aquela query, não que falta um índice.

---

## 6. Escolha do banco {#choosing}

| Situação | Banco recomendado | Por quê |
|---|---|---|
| Dados relacionais, transações ACID | PostgreSQL | Confiabilidade, recursos avançados |
| Dados simples, legado | MySQL | Amplamente suportado, simples |
| Documentos flexíveis, schema variável | MongoDB | Schema dinâmico, aggregation |
| Cache, sessões, filas simples | Redis | Microsegundos de latência |
| Time-series (métricas, IoT, logs) | TimescaleDB / InfluxDB | Otimizado para séries temporais |
| Buscas full-text | Elasticsearch / PostgreSQL (tsvector) | Busca relevante, facets |
| Escala global, multi-region writes | Cassandra / CockroachDB | Alta disponibilidade, partition tolerance |
| Grafos (redes sociais, permissões) | Neo4j / PostgreSQL (pgRouting) | Queries de grafo eficientes |

### Regra de decisão rápida
1. **Você tem relações complexas + precisa de transações?** → PostgreSQL
2. **Seu schema muda frequentemente + documentos aninhados?** → MongoDB
3. **Você precisa de sub-milissegundo?** → Redis
4. **Você tem bilhões de writes distribuídos globalmente?** → Cassandra
