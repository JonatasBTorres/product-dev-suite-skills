# Performance, Cache e Escalabilidade

## Sumário
1. [Estratégias de cache](#cache)
2. [Otimização de queries (N+1, índices)](#queries)
3. [Filas e processamento assíncrono](#queues)
4. [Escalabilidade horizontal](#scaling)
5. [Observabilidade (logs, métricas, traces)](#observability)

---

## 1. Estratégias de Cache {#cache}

### Padrões de cache

```
Cache-Aside (Lazy Loading) — mais comum:
  1. Verificar cache
  2. Se miss → buscar no banco → armazenar no cache → retornar
  Prós: só cacheia o que é usado; falha no cache não impacta disponibilidade
  Contras: first request sempre vai ao banco

Write-Through — consistência forte:
  1. Escrever no banco E no cache ao mesmo tempo
  Prós: cache sempre atualizado; boa para reads pesados
  Contras: overhead em writes; cacheia dados que podem não ser lidos

Write-Behind (Write-Back) — performance em writes:
  1. Escrever no cache imediatamente
  2. Persistir no banco de forma assíncrona
  Prós: writes muito rápidos
  Contras: risco de perda de dados se cache cair antes de persistir

Read-Through — transparente para o app:
  O próprio cache gerencia a busca no banco
  Prós: lógica centralizada no cache layer
  Contras: configuração mais complexa
```

```typescript
// Cache com estratégia de stale-while-revalidate
class SmartCache {
    constructor(private redis: Redis) {}

    async getOrFetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        opts: { ttl: number; staleFor?: number }
    ): Promise<T> {
        const cached = await this.redis.get(key);
        if (cached) {
            const data = JSON.parse(cached);
            
            // Se ainda válido, retorna diretamente
            if (data.expiresAt > Date.now()) return data.value;
            
            // Stale-while-revalidate: retorna dado antigo e atualiza em background
            if (opts.staleFor && data.expiresAt + opts.staleFor * 1000 > Date.now()) {
                this.revalidate(key, fetcher, opts.ttl).catch(console.error);
                return data.value;
            }
        }
        return this.revalidate(key, fetcher, opts.ttl);
    }

    private async revalidate<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
        const value = await fetcher();
        await this.redis.setEx(key, ttl + 60, JSON.stringify({
            value,
            expiresAt: Date.now() + ttl * 1000
        }));
        return value;
    }
}

// Cache de queries pesadas do banco
async function getProductCatalog(categoryId: string): Promise<Product[]> {
    const cacheKey = `catalog:${categoryId}`;
    return smartCache.getOrFetch(
        cacheKey,
        () => db.query('SELECT * FROM products WHERE category_id = $1 AND active = true', [categoryId]),
        { ttl: 300, staleFor: 60 } // 5 min TTL, 1 min de stale tolerado
    );
}
```

---

## 2. Otimização de Queries {#queries}

### Problema N+1 — o erro mais comum de performance

```typescript
// ❌ N+1: 1 query para listar + N queries para buscar detalhes
async function getOrdersWithUsers_BAD(): Promise<OrderWithUser[]> {
    const orders = await db.query('SELECT * FROM orders LIMIT 50'); // 1 query
    return Promise.all(orders.map(async (order) => {
        const user = await db.query('SELECT * FROM users WHERE id = $1', [order.userId]); // N queries!
        return { ...order, user: user[0] };
    }));
}

// ✅ JOIN: 1 única query
async function getOrdersWithUsers_GOOD(): Promise<OrderWithUser[]> {
    return db.query(`
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.status != 'cancelled'
        ORDER BY o.created_at DESC
        LIMIT 50
    `);
}

// ✅ DataLoader para GraphQL (batching automático)
const userLoader = new DataLoader(async (userIds: string[]) => {
    const users = await db.query(
        'SELECT * FROM users WHERE id = ANY($1)',
        [userIds]
    );
    const map = new Map(users.map(u => [u.id, u]));
    return userIds.map(id => map.get(id));
});
```

### Índices estratégicos

```sql
-- Analisar queries lentas
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Detectar sequential scans em tabelas grandes (sinal de índice faltando)
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND n_live_tup > 10000
ORDER BY seq_scan DESC;

-- Índice composto para queries com múltiplas condições
-- Query: WHERE status = 'active' AND created_at > '2025-01-01' ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY idx_orders_status_created
ON orders(status, created_at DESC)
WHERE status IN ('pending', 'processing'); -- índice parcial = menor, mais rápido

-- Full-text search nativo no PostgreSQL
ALTER TABLE products ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(description, '')), 'B')
    ) STORED;

CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Busca:
SELECT *, ts_rank(search_vector, query) AS rank
FROM products, to_tsquery('portuguese', 'camiseta & azul') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

---

## 3. Filas e Processamento Assíncrono {#queues}

```typescript
// Worker com Bull (Node.js) — processamento em background
import Queue from 'bull';

const emailQueue = new Queue('emails', { redis: process.env.REDIS_URL });

// Produtor — adicionar job à fila
async function scheduleWelcomeEmail(userId: string, email: string): Promise<void> {
    await emailQueue.add(
        'welcome',
        { userId, email },
        {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100, // manter últimos 100 jobs completos
            removeOnFail: false,   // manter jobs falhos para debug
        }
    );
}

// Consumidor — processar jobs da fila
emailQueue.process('welcome', 5, async (job) => { // 5 workers simultâneos
    const { userId, email } = job.data;
    
    await job.progress(10);
    const user = await userService.findById(userId);
    
    await job.progress(50);
    await emailProvider.send({
        to: email,
        template: 'welcome',
        variables: { name: user.name }
    });
    
    await job.progress(100);
    return { sentAt: new Date().toISOString() };
});

// Monitorar jobs falhos
emailQueue.on('failed', (job, err) => {
    logger.error('Email job failed', {
        jobId: job.id,
        data: job.data,
        error: err.message,
        attempts: job.attemptsMade,
    });
});
```

---

## 4. Escalabilidade Horizontal {#scaling}

```
Checklist de aplicação stateless (necessário para escalar horizontalmente):

✅ Sem estado em memória entre requests (sessão → Redis, não memória local)
✅ Sem arquivos locais como estado (use S3/GCS para uploads)
✅ Logs para stdout/stderr (não para arquivos locais)
✅ Configuração por variáveis de ambiente (12-factor app)
✅ Health checks implementados (/health/live e /health/ready)
✅ Graceful shutdown implementado (drena requests em andamento)
```

```typescript
// Graceful shutdown — não matar requests em andamento
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, starting graceful shutdown...');
    
    // Parar de aceitar novos requests
    server.close(async () => {
        logger.info('HTTP server closed');
        
        // Fechar conexões com banco e cache
        await db.end();
        await redis.quit();
        
        // Aguardar jobs em andamento terminarem
        await Promise.all(queues.map(q => q.close()));
        
        logger.info('Graceful shutdown complete');
        process.exit(0);
    });
    
    // Timeout de segurança: forçar saída após 30s
    setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
    }, 30_000);
});
```

---

## 5. Observabilidade {#observability}

### Logs estruturados

```typescript
// Sempre usar logger estruturado, nunca console.log em produção
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()   // JSON para ser parseável por ferramentas de log
    ),
    transports: [new transports.Console()],
    defaultMeta: {
        service: 'orders-api',
        version: process.env.APP_VERSION
    }
});

// Middleware para adicionar request ID a todos os logs
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] as string || generateId();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    // Adicionar contexto ao logger para todos os logs deste request
    req.logger = logger.child({ requestId, userId: req.user?.id });
    next();
});

// Log de acesso com métricas de performance
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        req.logger.info('HTTP request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: Date.now() - start,
            contentLength: res.get('content-length'),
        });
    });
    next();
});
```

### Métricas com Prometheus

```typescript
import { Counter, Histogram, register } from 'prom-client';

const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total de requisições HTTP',
    labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duração de requisições HTTP em ms',
    labelNames: ['method', 'route'],
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
});

// Endpoint de métricas para o Prometheus scrapar
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
```

### Tracing distribuído

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('orders-service');

async function processPayment(orderId: string, amount: number): Promise<void> {
    const span = tracer.startSpan('processPayment', {
        attributes: { 'order.id': orderId, 'payment.amount': amount }
    });

    try {
        await paymentGateway.charge(orderId, amount);
        span.setStatus({ code: SpanStatusCode.OK });
    } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
    } finally {
        span.end();
    }
}
```

---

## 9. Backup e recuperação {#backup-recovery}

### Playbook: Garantir recuperação de dados e continuidade operacional

**Quando usar:** Todo sistema em produção com dados que não podem ser perdidos.

**Conceitos-chave:**
- **RPO (Recovery Point Objective):** Quanto de dado posso perder? (ex: 1 hora de transações)
- **RTO (Recovery Time Objective):** Em quanto tempo preciso estar de volta? (ex: 4 horas)

**Estratégia de backup por tipo:**
```bash
# PostgreSQL — backup lógico (pg_dump)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# PostgreSQL — backup contínuo com WAL (Point-In-Time Recovery)
# Configurar no postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'aws s3 cp %p s3://my-backups/wal/%f'

# Restore para ponto específico no tempo
pg_restore --host=$DB_HOST --dbname=$DB_NAME backup.dump

# Testar restore regularmente (backup não testado não é backup)
pg_restore --host=$TEST_DB_HOST --dbname=restore_test backup.dump
psql -h $TEST_DB_HOST -d restore_test -c "SELECT count(*) FROM orders;"
```

**Automação de backup com verificação:**
```bash
#!/bin/bash
# backup.sh — executar via cron diariamente

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.dump"
S3_PATH="s3://my-backups/postgres/${BACKUP_FILE}"

echo "Iniciando backup: ${TIMESTAMP}"

# 1. Fazer backup
pg_dump -Fc "$DATABASE_URL" > "/tmp/${BACKUP_FILE}"

# 2. Verificar integridade do arquivo
pg_restore --list "/tmp/${BACKUP_FILE}" > /dev/null
echo "Backup íntegro"

# 3. Upload para S3 com checksum
aws s3 cp "/tmp/${BACKUP_FILE}" "${S3_PATH}" \
  --storage-class STANDARD_IA \
  --metadata "timestamp=${TIMESTAMP},db=${DB_NAME}"

# 4. Verificar se arquivo chegou
aws s3 ls "${S3_PATH}"

# 5. Limpar backups antigos (manter 30 dias)
aws s3 ls s3://my-backups/postgres/ \
  | awk '{print $4}' \
  | sort \
  | head -n -30 \
  | xargs -I{} aws s3 rm "s3://my-backups/postgres/{}"

# 6. Notificar monitoramento (dead man's switch)
curl -s "${BACKUP_HEARTBEAT_URL}"

echo "Backup concluído: ${S3_PATH}"
```

**Checklist de disaster recovery:**
```
Documentar e testar ANTES de precisar:
□ Backup automático configurado e verificado
□ Procedimento de restore documentado no runbook
□ Restore testado mensalmente em ambiente de staging
□ RPO e RTO definidos e comunicados ao negócio
□ Backups em região diferente da produção (georedundância)
□ Acesso ao backup não depende apenas de uma pessoa
□ Configuração de infraestrutura em código (IaC) — pode recriar do zero
□ Alertas se backup falhar ou não executar no prazo esperado

Teste de disaster recovery (DR drill):
1. Simular perda total do ambiente de produção
2. Seguir runbook de recovery do zero
3. Medir o RTO real (geralmente maior que o estimado)
4. Documentar o que faltou ou quebrou
5. Corrigir e repetir em 3-6 meses
```
