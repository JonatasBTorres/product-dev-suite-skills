# Domínios Especializados — Webhooks, Arquivos, Multi-tenant, Financeiro, Offline

## Sumário
1. [Integração com serviços externos](#external-services)
2. [Webhooks](#webhooks)
3. [Processamento de arquivos](#file-processing)
4. [Jobs agendados](#scheduled-jobs)
5. [Multi-tenant](#multi-tenant)
6. [Governança de recursos compartilhados — Noisy Neighbor](#saas-governance)
7. [Controle financeiro e transacional](#financial)
8. [Sistemas offline e sincronização](#offline-sync)
9. [Dados sensíveis — boas práticas](#sensitive-data)
10. [Contratos com frontend e mobile](#frontend-contracts)

---

## 1. Integração com serviços externos {#external-services}

### Playbook: Consumir APIs de terceiros com segurança e resiliência

**Quando usar:** Toda integração com pagamentos, CEP, SMS, email, redes sociais, ERPs, etc.

**Passos:**
1. Envolva a integração em um adapter/gateway (não chame direto no service)
2. Configure timeouts explícitos (nunca use o default infinito)
3. Implemente retry com backoff exponencial para erros transientes
4. Use circuit breaker para falhas persistentes
5. Trate e monitore cada tipo de erro diferentemente

```typescript
// Padrão: Gateway/Adapter para isolar integração externa
interface PaymentGateway {
    charge(params: ChargeParams): Promise<ChargeResult>;
    refund(transactionId: string, amount: number): Promise<RefundResult>;
}

class StripePaymentGateway implements PaymentGateway {
    private client: Stripe;
    private circuitBreaker: CircuitBreaker;

    constructor(apiKey: string) {
        this.client = new Stripe(apiKey, {
            timeout: 10_000,      // 10s timeout obrigatório
            maxNetworkRetries: 2, // retry automático para erros de rede
        });
        this.circuitBreaker = new CircuitBreaker({
            threshold: 5,
            timeout: 30_000,
        });
    }

    async charge(params: ChargeParams): Promise<ChargeResult> {
        return this.circuitBreaker.call(async () => {
            try {
                const paymentIntent = await this.client.paymentIntents.create({
                    amount: params.amountCents,
                    currency: params.currency,
                    payment_method: params.paymentMethodId,
                    confirm: true,
                    idempotency_key: params.idempotencyKey, // ESSENCIAL em pagamentos
                });
                return { transactionId: paymentIntent.id, status: 'success' };
            } catch (err) {
                if (err instanceof Stripe.errors.StripeCardError) {
                    throw new PaymentDeclinedError(err.message, err.code);
                }
                if (err instanceof Stripe.errors.StripeRateLimitError) {
                    throw new RateLimitError('Stripe rate limit', { retryAfter: 60 });
                }
                throw new PaymentGatewayError('Falha no gateway de pagamento', { cause: err });
            }
        });
    }
}

// Configurar timeouts em fetch/axios
const httpClient = axios.create({
    baseURL: process.env.EXTERNAL_API_URL,
    timeout: 5000,          // 5s — nunca omita
    headers: { 'User-Agent': 'my-service/1.0' },
});

// Interceptor para logging e tratamento de erros
httpClient.interceptors.response.use(
    response => response,
    error => {
        logger.error({
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
        }, 'Erro na chamada externa');

        if (error.code === 'ECONNABORTED') throw new TimeoutError();
        if (error.response?.status >= 500) throw new ExternalServiceError();
        throw error;
    }
);
```

---

## 2. Webhooks {#webhooks}

### Playbook: Expor e consumir webhooks com segurança

**Quando usar:** Receber notificações de eventos de serviços externos (Stripe, GitHub, Twilio, etc.) ou expor para clientes.

#### Receber webhooks (consumer):

**Passos:**
1. Verificar assinatura do payload (HMAC-SHA256 com segredo compartilhado)
2. Responder 200 imediatamente, processar assincronamente
3. Implementar idempotência (mesma notificação pode chegar duplicada)
4. Persistir payload bruto antes de processar
5. Configurar alerta se taxa de falhas de processamento aumentar

```typescript
// Endpoint de webhook com verificação de assinatura
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    // 1. Verificar assinatura — NUNCA pular isto
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,                         // raw body, não parseado
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        logger.warn({ signature }, 'Assinatura de webhook inválida');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    // 2. Responder 200 imediatamente (Stripe tem timeout de 30s)
    res.status(200).json({ received: true });

    // 3. Processar assincronamente com idempotência
    await webhookQueue.enqueue({
        eventId: event.id,
        eventType: event.type,
        payload: event,
        receivedAt: new Date().toISOString(),
    });
});

// Worker que processa webhooks da fila
class StripeWebhookProcessor {
    async process(job: WebhookJob): Promise<void> {
        // Idempotência
        const processed = await db.webhookEvents.findByEventId(job.eventId);
        if (processed) return;

        // Persistir antes de processar
        await db.webhookEvents.create({
            eventId: job.eventId,
            eventType: job.eventType,
            payload: JSON.stringify(job.payload),
            status: 'processing',
        });

        try {
            await this.handleEvent(job.eventType, job.payload);
            await db.webhookEvents.markProcessed(job.eventId);
        } catch (err) {
            await db.webhookEvents.markFailed(job.eventId, String(err));
            throw err; // re-throw para retry da fila
        }
    }

    private async handleEvent(type: string, event: Stripe.Event): Promise<void> {
        switch (type) {
            case 'payment_intent.succeeded':
                await this.onPaymentSuccess(event.data.object as Stripe.PaymentIntent);
                break;
            case 'payment_intent.payment_failed':
                await this.onPaymentFailed(event.data.object as Stripe.PaymentIntent);
                break;
            default:
                logger.debug({ type }, 'Evento de webhook não tratado');
        }
    }
}
```

#### Expor webhooks (producer):

```typescript
// Envio com retry e registro de entrega
class WebhookDispatcher {
    async dispatch(subscription: WebhookSubscription, event: DomainEvent): Promise<void> {
        const payload = {
            id: generateId(),
            type: event.eventType,
            createdAt: new Date().toISOString(),
            data: event.payload,
        };

        const signature = this.sign(JSON.stringify(payload), subscription.secret);

        const delivery = await db.webhookDeliveries.create({
            subscriptionId: subscription.id,
            eventType: event.eventType,
            payload: JSON.stringify(payload),
            status: 'pending',
            attempt: 1,
        });

        await this.sendWithRetry(subscription.url, payload, signature, delivery.id);
    }

    private async sendWithRetry(
        url: string, payload: object, signature: string, deliveryId: string
    ): Promise<void> {
        const maxAttempts = 5;
        const delays = [10, 60, 300, 1800, 7200]; // 10s, 1m, 5m, 30m, 2h

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature,
                        'X-Webhook-ID': deliveryId,
                        'X-Webhook-Timestamp': Date.now().toString(),
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(10_000),
                });

                if (response.ok) {
                    await db.webhookDeliveries.markDelivered(deliveryId);
                    return;
                }

                logger.warn({ url, status: response.status, attempt }, 'Webhook recusado pelo destino');
            } catch (err) {
                logger.warn({ url, err, attempt }, 'Falha ao enviar webhook');
            }

            if (attempt < maxAttempts - 1) {
                await sleep(delays[attempt] * 1000);
            }
        }

        await db.webhookDeliveries.markFailed(deliveryId);
    }

    private sign(payload: string, secret: string): string {
        return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
    }
}
```

---

## 3. Processamento de arquivos {#file-processing}

### Playbook: Upload, download, parsing e storage seguro de arquivos

**Passos para upload:**
1. Validar tipo MIME pelo conteúdo, não pela extensão
2. Limitar tamanho (server + client-side)
3. Escanear por vírus em arquivos de usuário
4. Armazenar em object storage (S3, GCS), nunca no servidor de aplicação
5. Nunca servir arquivos de upload diretamente — use CDN ou presigned URLs

```typescript
// Upload seguro com validação e S3
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fileType from 'file-type';

const s3 = new S3Client({ region: process.env.AWS_REGION });

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Arquivo não enviado' });

    // 1. Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'Arquivo muito grande (máx 10MB)' });
    }

    // 2. Validar MIME pelo conteúdo (não pela extensão — pode ser falsificado)
    const detected = await fileType.fromBuffer(file.buffer);
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
        return res.status(400).json({ error: 'Tipo de arquivo não permitido' });
    }

    // 3. Gerar nome seguro (nunca use o nome original diretamente)
    const ext = detected.ext;
    const key = `uploads/${req.user.id}/${generateId()}.${ext}`;

    // 4. Upload para S3 com metadados
    await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: file.buffer,
        ContentType: detected.mime,
        Metadata: {
            uploadedBy: req.user.id,
            originalName: Buffer.from(file.originalname).toString('base64'),
        },
        ServerSideEncryption: 'AES256',
    }));

    // 5. Salvar referência no banco (não a URL pública)
    const attachment = await db.attachments.create({
        userId: req.user.id,
        s3Key: key,
        mimeType: detected.mime,
        sizeBytes: file.size,
    });

    res.status(201).json({ attachmentId: attachment.id });
});

// Gerar presigned URL para download (temporária e autenticada)
async function getDownloadUrl(attachmentId: string, userId: string): Promise<string> {
    const attachment = await db.attachments.findById(attachmentId);
    if (!attachment) throw new NotFoundError('Attachment', attachmentId);
    if (attachment.userId !== userId) throw new ForbiddenError();

    return getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: attachment.s3Key,
    }), { expiresIn: 3600 }); // URL válida por 1 hora
}
```

**Parsing de arquivos grandes (streaming):**
```typescript
// Parsear CSV grande sem carregar tudo na memória
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

async function importProductsFromCSV(filePath: string): Promise<ImportResult> {
    let processed = 0;
    let errors = 0;

    await pipeline(
        createReadStream(filePath),
        parse({ columns: true, skip_empty_lines: true }),
        new Transform({
            objectMode: true,
            async transform(row, _enc, callback) {
                try {
                    await productService.upsert({
                        sku: row.sku,
                        name: row.name,
                        priceCents: Math.round(parseFloat(row.price) * 100),
                    });
                    processed++;
                } catch (err) {
                    errors++;
                    logger.warn({ row, err }, 'Erro ao importar produto');
                }
                callback();
            },
        }),
    );

    return { processed, errors };
}
```

---

## 4. Jobs agendados {#scheduled-jobs}

### Playbook: Implementar tarefas recorrentes seguras

**Passos:**
1. Garanta que jobs são idempotentes (pode reexecutar sem problema)
2. Implemente distributed lock para evitar execução paralela em múltiplas instâncias
3. Monitore duração e resultado de cada execução
4. Configure alertas para jobs que falham ou demoram muito
5. Implemente dead man's switch para detectar jobs que pararam de rodar

```typescript
// Job seguro com lock distribuído e observabilidade
import { CronJob } from 'cron';

class ProcessExpiredOrdersJob {
    async run(): Promise<void> {
        const jobName = 'process-expired-orders';
        const lockTtl = 5 * 60 * 1000; // 5 minutos max

        // Distributed lock — evita execução paralela em múltiplas instâncias
        const lock = await redlock.acquire([`job:${jobName}`], lockTtl);
        const startTime = Date.now();

        try {
            logger.info({ job: jobName }, 'Job iniciado');

            const expiredOrders = await db.orders.findExpired();
            logger.info({ job: jobName, count: expiredOrders.length }, 'Pedidos expirados encontrados');

            let processed = 0;
            for (const order of expiredOrders) {
                try {
                    await orderService.expire(order.id);
                    processed++;
                } catch (err) {
                    logger.error({ job: jobName, orderId: order.id, err }, 'Erro ao expirar pedido');
                }
            }

            const duration = Date.now() - startTime;
            logger.info({ job: jobName, processed, duration }, 'Job concluído');

            // Métrica de sucesso
            metrics.increment('job.success', { job: jobName });
            metrics.histogram('job.duration_ms', duration, { job: jobName });

        } catch (err) {
            logger.error({ job: jobName, err }, 'Job falhou');
            metrics.increment('job.failure', { job: jobName });
            throw err;
        } finally {
            await lock.release();
        }
    }
}

// Agendamento
const job = new CronJob('0 * * * *', async () => {
    await new ProcessExpiredOrdersJob().run();
}, null, true, 'America/Sao_Paulo');

// Dead man's switch — alerta se job não executar no prazo esperado
async function heartbeat(jobName: string): Promise<void> {
    await redis.setEx(`heartbeat:${jobName}`, 3600 + 300, Date.now().toString()); // TTL = período + margem
}
// Alerta no Prometheus quando chave expirar
```

---

## 5. Multi-tenant {#multi-tenant}

### Playbook: Projetar sistema multi-tenant com isolamento correto

**Estratégias de isolamento:**
| Estratégia | Isolamento | Custo | Quando usar |
|---|---|---|---|
| Database por tenant | Máximo | Alto | Compliance estrito, dados sensíveis |
| Schema por tenant | Alto | Médio | LGPD, segmentação clara |
| Row-level isolation | Baixo | Baixo | SaaS com muitos tenants pequenos |

**Regra prática de evolução:** comece com Row-Level Isolation (mais barato, resolve a maioria dos casos). Migre um tenant específico para schema ou banco dedicado só quando um requisito concreto exigir (contrato enterprise, volume que degrada os demais, regulação específica daquele cliente).

### 5.1 Row-level isolation — a estratégia padrão

```typescript
// Row-level isolation com tenant_id em todas as tabelas
// Garantido via middleware + RLS no PostgreSQL

// PostgreSQL Row Level Security
/*
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
*/

// Middleware: extrai tenant do JWT e configura no contexto
async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Tenant não identificado' });

    // Configurar no AsyncLocalStorage para propagar sem passar por parâmetro
    tenantContext.run({ tenantId }, next);
}

// Repository: injeta tenantId automaticamente em todas as queries
class TenantAwareOrderRepository {
    async findById(orderId: string): Promise<Order | null> {
        const tenantId = tenantContext.getStore()?.tenantId;
        if (!tenantId) throw new Error('Contexto de tenant não disponível');

        return db('orders')
            .where({ id: orderId, tenant_id: tenantId }) // SEMPRE filtrar por tenant
            .first();
    }

    async create(data: CreateOrderData): Promise<Order> {
        const tenantId = tenantContext.getStore()?.tenantId;

        return db('orders')
            .insert({ ...data, tenant_id: tenantId }) // SEMPRE incluir tenant_id
            .returning('*')
            .then(rows => rows[0]);
    }
}

// Testes: garantir que tenant A não acessa dados do tenant B
describe('TenantIsolation', () => {
    it('não deve retornar dados de outro tenant', async () => {
        const order = await createOrder({ tenantId: 'tenant-b' });

        tenantContext.run({ tenantId: 'tenant-a' }, async () => {
            const found = await repo.findById(order.id);
            expect(found).toBeNull(); // tenant-a não vê dados de tenant-b
        });
    });
});
```

**Ponto crítico de segurança:** RLS só protege se **toda** conexão de fato define `app.tenant_id` antes de qualquer query, e se a role de banco usada pela aplicação **não** tem `BYPASSRLS`. Trate "esquecer de setar o tenant" como bug tão grave quanto uma injeção de SQL — centralize isso no middleware acima, nunca deixe cada query manual responsável por lembrar.

### 5.2 Schema-per-tenant — implementação completa

```typescript
// 1. Provisionamento — criar o schema quando um tenant novo é registrado
async function provisionTenantSchema(tenantId: string): Promise<void> {
    // Sanitização OBRIGATÓRIA — nome de schema nunca pode vir direto de input do usuário
    // interpolado em SQL (não existe placeholder parametrizado para identificadores)
    const schemaName = toSafeSchemaName(tenantId); // ex: "tenant_a1b2c3d4" (só alfanumérico)

    await db.raw(`CREATE SCHEMA IF NOT EXISTS ??`, [schemaName]);

    // 2. Rodar TODAS as migrations do schema base contra o schema novo
    await runMigrationsForSchema(schemaName);

    // 3. Registrar o mapeamento tenant → schema (usado no roteamento de conexão)
    await db('tenant_registry').insert({ tenant_id: tenantId, schema_name: schemaName });
}

function toSafeSchemaName(tenantId: string): string {
    // Nunca aceite o tenantId bruto como nome de schema — gere um nome determinístico e seguro
    const hash = createHash('sha256').update(tenantId).digest('hex').slice(0, 16);
    return `tenant_${hash}`; // garante charset seguro, elimina qualquer risco de injeção via nome
}
```

```typescript
// 2. Migration runner — aplicar mudança de schema em TODOS os tenants, não um de cada vez manualmente
async function runMigrationAcrossAllTenants(migrationName: string): Promise<MigrationReport> {
    const tenants = await db('tenant_registry').select('schema_name');
    const results: MigrationReport = { succeeded: [], failed: [] };

    // Processar em paralelo controlado (não sequencial — seria lento demais com milhares de tenants;
    // não irrestrito — pode saturar o banco)
    const CONCURRENCY = 10;
    for (const batch of chunk(tenants, CONCURRENCY)) {
        await Promise.allSettled(
            batch.map(async ({ schema_name }) => {
                try {
                    await db.raw(`SET search_path TO ??`, [schema_name]);
                    await runPendingMigrations();
                    results.succeeded.push(schema_name);
                } catch (err) {
                    // Uma falha NÃO pode interromper os outros tenants — registrar e continuar
                    results.failed.push({ schema: schema_name, error: String(err) });
                }
            })
        );
    }

    if (results.failed.length > 0) {
        await alertOncall(`Migration falhou em ${results.failed.length} tenant(s)`, results.failed);
    }
    return results;
}
```

```typescript
// 3. Roteamento de conexão — resolver o schema certo por requisição
// Opção A: SET search_path por conexão (mais simples, cuidado com pool compartilhado)
async function withTenantSchema<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const { schema_name } = await getTenantRegistry(tenantId);
    const connection = await pool.getConnection();
    try {
        // search_path é por CONEXÃO — nunca reutilize a conexão para outro tenant
        // sem resetar, ou um tenant pode acabar lendo/escrevendo no schema errado
        await connection.query(`SET search_path TO ??`, [schema_name]);
        return await fn();
    } finally {
        await connection.query(`SET search_path TO public`); // reset antes de devolver ao pool
        connection.release();
    }
}

// Opção B (mais segura sob pool compartilhado): pool de conexão dedicado por schema
class TenantConnectionPoolRegistry {
    private pools = new Map<string, Pool>();

    getPool(schemaName: string): Pool {
        if (!this.pools.has(schemaName)) {
            this.pools.set(schemaName, createPool({
                ...baseConfig,
                options: `-c search_path=${schemaName}`, // fixado na criação da conexão, nunca muda
            }));
        }
        return this.pools.get(schemaName)!;
    }
}
```

**Antipadrão fatal:** nunca construa o nome do schema por concatenação de string direto do input, como em uma query que interpola `${tenantId}` cru no lugar do schema — isso é SQL injection via identificador. Sempre use um nome de schema gerado deterministicamente (hash) e nunca o valor bruto fornecido pelo usuário.

### 5.3 Database-per-tenant — implementação completa

```typescript
// Registry de qual banco físico cada tenant usa
interface TenantDatabaseConfig {
    tenantId: string;
    host: string;
    database: string;
    // Credenciais nunca em texto puro aqui — buscar de Vault/Secrets Manager na hora do uso
    secretRef: string;
}

class TenantDatabaseConnectionRegistry {
    private connections = new Map<string, Pool>();

    async getConnection(tenantId: string): Promise<Pool> {
        if (this.connections.has(tenantId)) return this.connections.get(tenantId)!;

        const config = await this.loadTenantDbConfig(tenantId); // do registry central
        const credentials = await vault.getCredentials(config.secretRef);

        const pool = createPool({
            host: config.host,
            database: config.database,
            user: credentials.username,
            password: credentials.password,
            max: 5, // pool POR TENANT precisa ser pequeno — N tenants x pool grande esgota conexões do host
        });

        this.connections.set(tenantId, pool);
        return pool;
    }

    // Fechar conexões ociosas — com muitos tenants, não dá para manter todo pool sempre aberto
    async evictIdleConnections(idleThresholdMs: number): Promise<void> {
        for (const [tenantId, pool] of this.connections) {
            if (pool.idleSince() > idleThresholdMs) {
                await pool.end();
                this.connections.delete(tenantId);
            }
        }
    }
}

// Provisionamento de banco novo — geralmente via IaC, não só código de aplicação
async function provisionTenantDatabase(tenantId: string): Promise<void> {
    // 1. Criar o banco físico (Terraform/script administrativo, fora do runtime da aplicação)
    const dbInstance = await createManagedDatabaseInstance({ tenantId });
    // 2. Rodar todas as migrations contra o banco novo
    await runMigrationsAgainst(dbInstance.connectionString);
    // 3. Registrar credenciais no Vault, nunca em variável de ambiente estática
    const secretRef = await vault.storeCredentials(tenantId, dbInstance.credentials);
    // 4. Registrar no catálogo central
    await tenantRegistry.insert({ tenantId, host: dbInstance.host, database: dbInstance.name, secretRef });
}
```

**Regra prática:** o pool de conexão por tenant deve ser pequeno (2-5 conexões), nunca o tamanho de um pool single-tenant — com centenas de tenants, um pool de 20 cada esgotaria o `max_connections` do Postgres rapidamente. Feche conexões ociosas periodicamente (`evictIdleConnections`).

## 6. Governança de recursos compartilhados — Noisy Neighbor {#saas-governance}

### O problema

Um tenant com uso anômalo (query pesada, pico de escrita) não deveria degradar a experiência dos demais tenants que compartilham a mesma infraestrutura (relevante mesmo com Row-Level Isolation, onde todos compartilham o mesmo banco/pool).

### Rate limiting e quotas por plano — token bucket

```typescript
// Token bucket: permite rajadas curtas mas limita a taxa sustentada — mais justo
// que "fixed window" (que permite 2x o limite na fronteira entre janelas)
class TokenBucketRateLimiter {
    constructor(
        private readonly redis: Redis,
        private readonly capacity: number,      // ex: 100 requisições
        private readonly refillPerSecond: number, // ex: 10/s
    ) {}

    async tryConsume(tenantId: string, cost = 1): Promise<RateLimitResult> {
        const key = `ratelimit:${tenantId}`;
        const now = Date.now();

        // Script Lua garante atomicidade — evita race condition entre leitura e escrita do bucket
        const result = await this.redis.eval(TOKEN_BUCKET_SCRIPT, {
            keys: [key],
            arguments: [String(this.capacity), String(this.refillPerSecond), String(now), String(cost)],
        });

        const [allowed, remaining, resetAt] = result as [number, number, number];
        return { allowed: allowed === 1, remaining, resetAt };
    }
}

// Limites diferentes por plano — configuração, nunca hardcoded no código
const planLimits: Record<string, { capacity: number; refillPerSecond: number }> = {
    free: { capacity: 100, refillPerSecond: 2 },
    pro: { capacity: 1000, refillPerSecond: 20 },
    enterprise: { capacity: 10000, refillPerSecond: 200 },
};

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const { tenantId, plan } = req.tenant;
    const limits = planLimits[plan] ?? planLimits.free;
    const limiter = new TokenBucketRateLimiter(redis, limits.capacity, limits.refillPerSecond);

    const result = await limiter.tryConsume(tenantId);

    // Expor os limites ao cliente — reduz ticket de suporte, permite o cliente implementar backoff
    res.set('X-RateLimit-Limit', String(limits.capacity));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
        return res.status(429).json({ error: 'rate_limit_exceeded', retryAfter: result.resetAt });
    }
    next();
}
```

### Connection pooling segmentado por tier de plano

```yaml
# PgBouncer — pools segmentados: tenant enterprise nunca compete pelo mesmo pool
# que centenas de tenants do plano gratuito
[databases]
tenant_pool_enterprise = host=postgres dbname=app pool_size=50
tenant_pool_standard   = host=postgres dbname=app pool_size=30
tenant_pool_free       = host=postgres dbname=app pool_size=20

[pgbouncer]
pool_mode = transaction   # libera conexão entre transações — maximiza reuso sob muitos tenants
```

```typescript
// Aplicação escolhe o pool pelo plano do tenant, não um pool único para todos
function getPoolForTenant(plan: string): Pool {
    const poolMap = { enterprise: enterprisePool, pro: standardPool, free: freePool };
    return poolMap[plan] ?? freePool;
}
```

### Filas dedicadas por tier — evita que o plano gratuito atrase o enterprise

```typescript
// Processamento assíncrono: fila separada por tier, worker dedicado por fila
const queueByPlan = {
    enterprise: 'jobs.enterprise',  // SLA mais curto, mais workers dedicados
    pro: 'jobs.standard',
    free: 'jobs.free',              // pode acumular backlog sob pico sem afetar os outros
};

async function enqueueJob(tenantId: string, plan: string, job: Job): Promise<void> {
    await queue.publish(queueByPlan[plan] ?? queueByPlan.free, { tenantId, ...job });
}
```

### Observabilidade por tenant

```typescript
// tenant_id como dimensão obrigatória em métricas e logs — sem isso, debugar
// "por que o tenant X está lento" vira arqueologia manual
logger.info('order_processed', { tenantId, orderId, durationMs, plan });
metrics.histogram('order_processing_duration_ms', durationMs, { tenant_id: tenantId, plan });
```

### Checklist de governança multi-tenant
- [ ] Rate limiting por tenant (não só por IP/API key genérica), com limite configurável por plano
- [ ] Algoritmo token bucket ou sliding window (nunca fixed window simples)
- [ ] Headers `X-RateLimit-*` expostos ao cliente
- [ ] Pool de conexão segmentado por tier — enterprise nunca compete com o plano gratuito
- [ ] Fila/worker dedicado por tier quando o SLA de planos diferentes justificar
- [ ] `tenant_id` como dimensão em toda métrica e log relevante
- [ ] Teste automatizado de isolamento entre tenants (não assumir que "o código parece certo")


---

## 7. Controle financeiro e transacional {#financial}

### Playbook: Implementar operações financeiras com precisão e rastreabilidade

**Regras de ouro:**
1. NUNCA use float/double para valores monetários — use inteiros (centavos)
2. SEMPRE use transações ACID para operações de débito/crédito
3. Implemente ledger imutável (append-only) para auditoria
4. Toda operação deve ser idempotente
5. Reconcilie periodicamente com o gateway de pagamento

```typescript
// ✅ Valores em centavos (inteiro)
type Cents = number;
const price: Cents = 1999; // R$ 19,99

// ✅ Display para usuário
function formatCurrency(cents: Cents, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
    }).format(cents / 100);
}

// Ledger imutável — append-only (nunca atualizar, apenas inserir)
interface LedgerEntry {
    id: string;
    accountId: string;
    type: 'DEBIT' | 'CREDIT';
    amountCents: Cents;
    description: string;
    referenceId: string;       // orderId, refundId, etc.
    referenceType: string;     // 'ORDER', 'REFUND', 'FEE', etc.
    idempotencyKey: string;
    createdAt: Date;
    // Nunca tem updatedAt ou deletedAt — é imutável
}

// Transferência entre contas com garantias ACID
async function transferFunds(
    fromAccountId: string,
    toAccountId: string,
    amountCents: Cents,
    description: string,
    idempotencyKey: string
): Promise<void> {
    await db.transaction(async (trx) => {
        // Verificar idempotência dentro da transação
        const existing = await trx('ledger_entries')
            .where('idempotency_key', idempotencyKey)
            .first();

        if (existing) return; // Já processado, safe to return

        // Lock das contas em ordem lexicográfica (evita deadlock)
        const [first, second] = [fromAccountId, toAccountId].sort();
        await trx.raw('SELECT id FROM accounts WHERE id = ANY(?) FOR UPDATE', [[first, second]]);

        // Verificar saldo
        const fromAccount = await trx('accounts').where('id', fromAccountId).first();
        if (fromAccount.balanceCents < amountCents) {
            throw new InsufficientFundsError(fromAccountId, amountCents, fromAccount.balanceCents);
        }

        // Débito na origem
        await trx('ledger_entries').insert({
            id: generateId(),
            account_id: fromAccountId,
            type: 'DEBIT',
            amount_cents: amountCents,
            description,
            idempotency_key: `${idempotencyKey}-debit`,
            created_at: new Date(),
        });

        // Crédito no destino
        await trx('ledger_entries').insert({
            id: generateId(),
            account_id: toAccountId,
            type: 'CREDIT',
            amount_cents: amountCents,
            description,
            idempotency_key: `${idempotencyKey}-credit`,
            created_at: new Date(),
        });

        // Atualizar saldos (derivados do ledger, mas mantidos para performance)
        await trx('accounts').where('id', fromAccountId).decrement('balance_cents', amountCents);
        await trx('accounts').where('id', toAccountId).increment('balance_cents', amountCents);
    });
}

// Consultar saldo calculado do ledger (para auditoria/reconciliação)
async function calculateBalance(accountId: string): Promise<Cents> {
    const result = await db('ledger_entries')
        .where('account_id', accountId)
        .select(db.raw(`
            SUM(CASE WHEN type = 'CREDIT' THEN amount_cents ELSE -amount_cents END) as balance
        `))
        .first();

    return result.balance ?? 0;
}
```

---

## 8. Sistemas offline e sincronização {#offline-sync}

### Playbook: Backend para apps com suporte offline

**Passos:**
1. Defina estratégia de resolução de conflitos antes de implementar
2. Use timestamps vetoriais (vector clocks) ou CRDTs para conflitos complexos
3. Implemente endpoint de sync incremental (delta, não full-load)
4. Versione cada recurso para detectar conflitos
5. Registre operações no cliente (operation log) para replay

```typescript
// Sync incremental — retorna apenas o que mudou desde o último sync
app.get('/sync', async (req, res) => {
    const { lastSyncedAt, deviceId } = req.query;

    const since = lastSyncedAt ? new Date(lastSyncedAt as string) : new Date(0);

    const [created, updated, deleted] = await Promise.all([
        db.items.createdAfter(req.user.id, since),
        db.items.updatedAfter(req.user.id, since),
        db.deletedItems.findAfter(req.user.id, since), // tombstones para deleção
    ]);

    res.json({
        serverTime: new Date().toISOString(),
        changes: {
            created,
            updated,
            deleted: deleted.map(d => d.itemId),
        },
    });
});

// Push de mudanças do cliente com resolução de conflitos
app.post('/sync/push', async (req, res) => {
    const { changes, deviceId, baseVersion } = req.body;
    const conflicts: Conflict[] = [];
    const applied: Change[] = [];

    for (const change of changes) {
        const server = await db.items.findById(change.id);

        if (!server) {
            // Novo item — criar
            await db.items.create({ ...change.data, version: 1 });
            applied.push(change);
        } else if (server.version === change.baseVersion) {
            // Sem conflito — aplicar
            await db.items.update(change.id, { ...change.data, version: server.version + 1 });
            applied.push(change);
        } else {
            // Conflito — versão do servidor é diferente da base do cliente
            conflicts.push({
                id: change.id,
                clientData: change.data,
                serverData: server,
                resolution: 'last_write_wins', // ou 'manual', 'merge'
            });

            // Last-write-wins: comparar timestamps
            if (change.updatedAt > server.updatedAt) {
                await db.items.update(change.id, { ...change.data, version: server.version + 1 });
                applied.push(change);
            }
        }
    }

    res.json({ applied: applied.length, conflicts });
});
```

---

## 9. Dados sensíveis — boas práticas {#sensitive-data}

### Playbook: Tratar dados pessoais e sensíveis com segurança

**Checklist LGPD/GDPR:**
- [ ] Dados pessoais mapeados e documentados (data mapping)
- [ ] Base legal definida para cada dado coletado
- [ ] Minimização: só coletamos o necessário
- [ ] Retenção definida: dados apagados quando não mais necessários
- [ ] Direito ao esquecimento implementado
- [ ] Dados mascarados em logs e respostas de API

```typescript
// Mascarar dados sensíveis em logs e responses
function maskCPF(cpf: string): string {
    return cpf.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.***-$2');
}

function maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
}

function maskCard(number: string): string {
    return `**** **** **** ${number.slice(-4)}`;
}

// Serializer que mascara automaticamente para logs
function sanitizeForLog(data: Record<string, any>): Record<string, any> {
    const SENSITIVE_FIELDS = new Set(['password', 'cpf', 'rg', 'creditCard', 'token', 'secret', 'ssn']);

    return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
            key,
            SENSITIVE_FIELDS.has(key) ? '[REDACTED]' : value,
        ])
    );
}

// Direito ao esquecimento
async function anonymizeUser(userId: string): Promise<void> {
    await db.transaction(async (trx) => {
        await trx('users').where('id', userId).update({
            name: 'Usuário Removido',
            email: `deleted_${userId}@deleted.invalid`,
            phone: null,
            cpf: null,
            deleted_at: new Date(),
            anonymized_at: new Date(),
        });

        // Manter registros de transação (obrigação legal), mas anonimizar PII
        await trx('orders').where('user_id', userId).update({
            shipping_address: null,
            recipient_name: 'Removido',
        });
    });
}
```

---

## 10. Contratos com frontend e mobile {#frontend-contracts}

### Playbook: Criar e manter APIs estáveis para clientes

**Regras para APIs consumidas por frontend/mobile:**
1. Versione sua API desde o início (`/api/v1/`)
2. Nunca remova campos — deprecie e mantenha em paralelo
3. Use OpenAPI/Swagger como fonte de verdade do contrato
4. Implemente testes de contrato (Pact/consumer-driven)
5. Comunique breaking changes com antecedência

```typescript
// Versionamento de API
// v1 (manter para clientes existentes)
router.get('/api/v1/users/:id', async (req, res) => {
    const user = await userService.findById(req.params.id);
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        // campo deprecated mas mantido para não quebrar clientes v1
        full_name: user.name,
    });
});

// v2 (nova versão com melhorias)
router.get('/api/v2/users/:id', async (req, res) => {
    const user = await userService.findById(req.params.id);
    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        // full_name removido na v2 (só após todos migrarem)
    });
});

// Response envelope padronizado (facilita parsing no cliente)
interface ApiResponse<T> {
    data: T;
    meta?: {
        page?: number;
        total?: number;
        cursor?: string;
    };
    errors?: Array<{
        code: string;
        message: string;
        field?: string;
    }>;
}

// Exemplo de erro bem estruturado
res.status(422).json({
    data: null,
    errors: [
        { code: 'VALIDATION_ERROR', message: 'Email inválido', field: 'email' },
        { code: 'VALIDATION_ERROR', message: 'Senha deve ter no mínimo 8 caracteres', field: 'password' },
    ],
});
```
