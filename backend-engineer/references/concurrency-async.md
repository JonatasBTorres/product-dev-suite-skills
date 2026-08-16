# Programação Assíncrona, Concorrência e Eventos

## Sumário
1. [Programação assíncrona](#async)
2. [Concorrência e paralelismo](#concurrency)
3. [Programação orientada a eventos](#event-driven)
4. [Debugging de problemas assíncronos](#async-debug)

---

## 1. Programação assíncrona {#async}

### Playbook: Implementar operações assíncronas corretamente

**Quando usar:** Toda operação de I/O (banco, rede, disco, fila) deve ser async para não bloquear a thread principal.

**Passos:**
1. Identifique operações de I/O no seu fluxo
2. Retorne Promises/Tasks/Coroutines ao invés de bloquear
3. Use `async/await` para código legível — evite callback hell
4. Trate erros com try/catch em funções async
5. Gerencie concorrência quando executar múltiplas operações em paralelo

```typescript
// ✅ Padrão correto: async/await com tratamento de erro
async function getUserWithOrders(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Paralelo quando independentes
    const [orders, preferences] = await Promise.all([
        orderRepo.findByUserId(userId),
        preferenceRepo.findByUserId(userId),
    ]);

    return { ...user, orders, preferences };
}

// ✅ Processar lista com concorrência limitada (evitar sobrecarga)
async function processOrdersBatch(orderIds: string[]): Promise<void> {
    const CONCURRENCY = 5;
    const chunks = chunk(orderIds, CONCURRENCY);

    for (const batch of chunks) {
        await Promise.all(batch.map(id => processOrder(id)));
        // Processar próximo batch só após este terminar
    }
}

// Alternativa: p-limit para controle preciso de concorrência
import pLimit from 'p-limit';
const limit = pLimit(5);

const results = await Promise.all(
    orderIds.map(id => limit(() => processOrder(id)))
);
```

```python
# Python asyncio
import asyncio
from asyncio import TaskGroup

async def get_user_with_orders(user_id: str):
    user = await user_repo.find_by_id(user_id)
    if not user:
        raise NotFoundError(f"User {user_id} not found")

    # Paralelo com TaskGroup (Python 3.11+)
    async with TaskGroup() as tg:
        orders_task = tg.create_task(order_repo.find_by_user_id(user_id))
        prefs_task = tg.create_task(pref_repo.find_by_user_id(user_id))

    return {**user.dict(), "orders": orders_task.result(), "preferences": prefs_task.result()}

# Semáforo para limitar concorrência
async def process_batch(items: list[str]) -> None:
    semaphore = asyncio.Semaphore(10)  # máximo 10 simultâneos

    async def bounded_process(item: str):
        async with semaphore:
            await process_item(item)

    await asyncio.gather(*[bounded_process(item) for item in items])
```

**Promise patterns avançados:**
```typescript
// Promise.allSettled — quando você quer todos os resultados, mesmo com erros
const results = await Promise.allSettled([
    fetchFromServiceA(),
    fetchFromServiceB(),
    fetchFromServiceC(),
]);

const successes = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(r => r.value);

const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);

// Promise.race — timeout pattern
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new TimeoutError(`Timeout após ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
}

// Promise.any — primeiro que resolver com sucesso
const result = await Promise.any([
    fetchFromRegionA(),
    fetchFromRegionB(),
    fetchFromRegionC(),
]); // retorna o primeiro sucesso, ignora falhas
```

**Anti-patterns:**
```typescript
// ❌ Await em loop sequencial — lento se operações são independentes
for (const id of ids) {
    await processOrder(id); // cada um espera o anterior — O(n * latência)
}

// ✅ Promise.all em paralelo
await Promise.all(ids.map(id => processOrder(id)));

// ❌ Async sem try/catch — Unhandled Promise Rejection
async function riskyOperation() {
    const data = await externalApi.fetch(); // se falhar, erro não tratado
    return transform(data);
}

// ✅ Sempre tratar erros em funções async
async function safeOperation() {
    try {
        const data = await externalApi.fetch();
        return transform(data);
    } catch (err) {
        logger.error({ err }, 'Falha na operação');
        throw new ServiceError('Falha ao buscar dados externos', { cause: err });
    }
}

// ❌ Fire-and-forget sem tratamento (silencia erros)
sendEmailAsync(user.email); // se falhar, ninguém sabe

// ✅ Fire-and-forget com tratamento explícito
sendEmailAsync(user.email).catch(err =>
    logger.error({ err, email: user.email }, 'Falha ao enviar email')
);
```

---

## 2. Concorrência e paralelismo {#concurrency}

### Playbook: Implementar concorrência segura

**Quando usar:** Múltiplas execuções simultâneas que compartilham estado ou recursos.

**Conceitos:**
- **Race condition:** Resultado depende da ordem de execução (imprevisível)
- **Deadlock:** Dois processos esperando um pelo outro indefinidamente
- **Starvation:** Um processo nunca consegue acesso ao recurso

**Passos para implementação segura:**
1. Identifique recursos compartilhados (cache, banco, arquivos, contadores)
2. Use transações no banco para operações atômicas
3. Use locks distribuídos (Redis) para coordenação entre instâncias
4. Prefira operações atômicas a read-modify-write manual
5. Use filas para serializar acesso a recursos críticos

```typescript
// ❌ Race condition em contadores
async function deductStock(productId: string, quantity: number) {
    const product = await db.findProduct(productId);   // lê stock = 10
    if (product.stock < quantity) throw new Error('Sem estoque');
    // Outra requisição simultânea também lê stock = 10 aqui!
    await db.updateProduct(productId, { stock: product.stock - quantity }); // escreve 9
    // Ambas as requisições escrevem 9 — perdemos uma venda!
}

// ✅ Operação atômica no banco (SQL)
async function deductStockAtomic(productId: string, quantity: number) {
    const result = await db.query(`
        UPDATE products
        SET stock = stock - $1
        WHERE id = $2 AND stock >= $1
        RETURNING stock
    `, [quantity, productId]);

    if (result.rowCount === 0) throw new InsufficientStockError(productId);
    return result.rows[0].stock;
}

// ✅ Distributed lock com Redis (para coordenar entre instâncias)
import Redlock from 'redlock';

const redlock = new Redlock([redis], {
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 100,
});

async function processUniqueOperation(key: string) {
    const lock = await redlock.acquire([`lock:${key}`], 5000); // TTL 5s

    try {
        // Seção crítica — apenas uma instância executa por vez
        const current = await redis.get(key);
        const updated = transform(current);
        await redis.set(key, updated);
    } finally {
        await lock.release();
    }
}
```

```java
// Java: ReentrantLock para concorrência em memória
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.ConcurrentHashMap;

public class OrderProcessor {
    private final ConcurrentHashMap<String, ReentrantLock> orderLocks = new ConcurrentHashMap<>();

    public void processOrder(String orderId) {
        ReentrantLock lock = orderLocks.computeIfAbsent(orderId, k -> new ReentrantLock());

        if (!lock.tryLock()) {
            throw new ConcurrentProcessingException("Order " + orderId + " already being processed");
        }

        try {
            // seção crítica
            doProcess(orderId);
        } finally {
            lock.unlock();
            orderLocks.remove(orderId); // cleanup
        }
    }
}

// Java: ExecutorService para paralelismo controlado
import java.util.concurrent.*;

ExecutorService executor = Executors.newFixedThreadPool(
    Runtime.getRuntime().availableProcessors()
);

List<Future<Result>> futures = items.stream()
    .map(item -> executor.submit(() -> processItem(item)))
    .toList();

List<Result> results = new ArrayList<>();
for (Future<Result> future : futures) {
    try {
        results.add(future.get(5, TimeUnit.SECONDS)); // timeout por item
    } catch (TimeoutException e) {
        future.cancel(true);
        log.warn("Item processing timeout");
    }
}
executor.shutdown();
```

**Evitando deadlocks:**
```typescript
// ❌ Deadlock: Thread A tem lock1, espera lock2; Thread B tem lock2, espera lock1
async function transferMoney(fromId: string, toId: string, amount: number) {
    const lockFrom = await redlock.acquire([`account:${fromId}`], 5000);
    const lockTo = await redlock.acquire([`account:${toId}`], 5000); // DEADLOCK se outra thread faz o inverso
    // ...
}

// ✅ Ordenação de locks: sempre adquirir na mesma ordem
async function transferMoney(fromId: string, toId: string, amount: number) {
    // Sempre bloquear na ordem lexicográfica do ID
    const [firstId, secondId] = [fromId, toId].sort();
    const locks = await redlock.acquire([`account:${firstId}`, `account:${secondId}`], 5000);
    // ...
}
```

---

## 3. Programação orientada a eventos {#event-driven}

### Playbook: Implementar event-driven architecture

**Quando usar:** Desacoplamento entre serviços, notificações assíncronas, side-effects de operações de negócio.

**Passos:**
1. Defina o contrato do evento (schema versionado)
2. Implemente producer no lado da operação de negócio
3. Use outbox pattern para garantir entrega transacional
4. Implemente consumer com idempotência
5. Configure dead letter queue para mensagens com falha

```typescript
// Contrato de evento (schema bem definido e versionado)
interface OrderCreatedEvent {
    eventId: string;          // UUID único por evento
    eventType: 'ORDER_CREATED';
    eventVersion: '1.0';
    occurredAt: string;       // ISO 8601
    aggregateId: string;      // orderId
    aggregateType: 'Order';
    payload: {
        orderId: string;
        userId: string;
        items: Array<{ productId: string; quantity: number; priceCents: number }>;
        totalCents: number;
        paymentMethod: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
    };
    metadata?: {
        correlationId?: string;
        causationId?: string;  // eventId que causou este evento
    };
}

// EventBus abstraction
interface EventBus {
    publish(event: DomainEvent): Promise<void>;
    subscribe(eventType: string, handler: EventHandler): void;
}

// Event sourcing pattern — estado derivado de eventos
class OrderAggregate {
    private state: OrderState = { status: 'new', items: [] };
    private uncommittedEvents: DomainEvent[] = [];

    // Aplica evento ao estado (puro, sem side-effects)
    private apply(event: DomainEvent): void {
        switch (event.eventType) {
            case 'ORDER_CREATED':
                this.state = { ...this.state, status: 'created', ...event.payload };
                break;
            case 'ORDER_CONFIRMED':
                this.state.status = 'confirmed';
                break;
            case 'ORDER_SHIPPED':
                this.state.status = 'shipped';
                this.state.trackingCode = event.payload.trackingCode;
                break;
        }
    }

    // Reconstrói estado a partir do histórico de eventos
    static reconstituteFrom(events: DomainEvent[]): OrderAggregate {
        const order = new OrderAggregate();
        events.forEach(event => order.apply(event));
        return order;
    }

    // Comando — gera evento
    confirm(): void {
        if (this.state.status !== 'created') {
            throw new DomainError('Apenas pedidos criados podem ser confirmados');
        }
        const event: OrderConfirmedEvent = {
            eventId: generateId(),
            eventType: 'ORDER_CONFIRMED',
            occurredAt: new Date().toISOString(),
            aggregateId: this.state.orderId,
        };
        this.apply(event);
        this.uncommittedEvents.push(event);
    }
}

// Consumer com idempotência e dead letter queue
class OrderEventConsumer {
    async handle(message: Message): Promise<void> {
        const event = JSON.parse(message.body) as DomainEvent;

        // Idempotência: pular se já processado
        const alreadyProcessed = await this.processedEvents.exists(event.eventId);
        if (alreadyProcessed) {
            logger.debug({ eventId: event.eventId }, 'Evento duplicado, ignorando');
            await message.ack();
            return;
        }

        try {
            await this.processEvent(event);
            await this.processedEvents.mark(event.eventId, '7d');
            await message.ack();
        } catch (err) {
            const attempts = message.deliveryCount ?? 1;

            if (attempts >= 3) {
                // Manda para DLQ após 3 tentativas
                logger.error({ event, err, attempts }, 'Evento movido para DLQ');
                await this.deadLetterQueue.send(message);
                await message.ack(); // remove da fila original
            } else {
                logger.warn({ event, err, attempts }, 'Falha ao processar evento, reenfileirando');
                await message.nack(true); // requeue
            }
        }
    }
}
```

**Padrão Saga (coordenar transações distribuídas):**
```typescript
// Saga Orquestrada — um orquestrador central coordena os passos
class CreateOrderSaga {
    async execute(input: CreateOrderInput): Promise<void> {
        const sagaId = generateId();

        try {
            // Passo 1: Reservar estoque
            const reservation = await inventoryService.reserve(input.items, sagaId);

            try {
                // Passo 2: Processar pagamento
                const payment = await paymentService.charge(input.paymentDetails, sagaId);

                try {
                    // Passo 3: Criar pedido
                    await orderService.create({ ...input, paymentId: payment.id, reservationId: reservation.id });
                } catch (err) {
                    // Compensação passo 3
                    await paymentService.refund(payment.id);
                    await inventoryService.release(reservation.id);
                    throw err;
                }
            } catch (err) {
                // Compensação passo 2
                await inventoryService.release(reservation.id);
                throw err;
            }
        } catch (err) {
            logger.error({ sagaId, err }, 'Saga falhou com compensações aplicadas');
            throw err;
        }
    }
}
```

---

## 4. Debugging de problemas assíncronos {#async-debug}

### Playbook: Diagnosticar problemas de concorrência e async

**Sintomas comuns:**
| Sintoma | Causa provável |
|---|---|
| Resultado inconsistente em dados | Race condition |
| Aplicação trava sem consumir CPU | Deadlock ou await infinito |
| Memory leak crescente | Promises não resolvidas ou event listeners não removidos |
| Timeout intermitente | Saturação de conexões ou thread pool |
| Duplicação de processamento | Falta de idempotência |

**Ferramentas de diagnóstico:**
```bash
# Node.js: detectar event loop bloqueado
node --trace-warnings app.js

# Ver handles e requests ativos (por que processo não encerra?)
node --inspect app.js
# No DevTools: Memory → Heap Snapshot → procurar por Promise pendentes

# Python: detectar coroutines não awaited
python -W error::RuntimeWarning app.py

# Java: thread dump para detectar deadlock
kill -3 <pid>
# ou
jstack <pid> | grep -A 30 "deadlock"

# Detectar conexões de banco não retornadas ao pool
SELECT pid, state, query, now() - query_start as duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

**Testes de concorrência:**
```typescript
// Teste de race condition com múltiplas requisições simultâneas
describe('deductStock', () => {
    it('não deve vender mais do que o estoque disponível', async () => {
        await db.setStock(productId, 5); // 5 unidades disponíveis

        // 10 requisições simultâneas tentando comprar 1 unidade cada
        const results = await Promise.allSettled(
            Array.from({ length: 10 }, () => deductStockAtomic(productId, 1))
        );

        const successes = results.filter(r => r.status === 'fulfilled');
        const failures = results.filter(r => r.status === 'rejected');

        expect(successes).toHaveLength(5); // apenas 5 devem ter sucesso
        expect(failures).toHaveLength(5);  // as demais devem falhar
        expect(await db.getStock(productId)).toBe(0); // estoque zerou
    });
});
```
