# Linguagens e Frameworks — Referência Backend

## Sumário
1. [Python (FastAPI / Django)](#python)
2. [Java (Spring Boot)](#java)
3. [Node.js / TypeScript](#nodejs)
4. [Go](#go)
5. [Kotlin](#kotlin)
6. [C# (.NET)](#csharp)
7. [Estruturas de Dados e Algoritmos](#dsa)
8. [Protocolos de Internet](#protocols)

---

## 1. Python — FastAPI e Django {#python}

### FastAPI — API assíncrona moderna

```python
# main.py — estrutura de projeto FastAPI
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: inicializar conexões, cache, etc.
    await database.connect()
    yield
    # Shutdown: fechar conexões
    await database.disconnect()

app = FastAPI(
    title="My API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://meuapp.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

```python
# routes/users.py — padrão de rota com validação Pydantic
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid

router = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    role: str = Field(pattern="^(admin|user|viewer)$")

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: str

    class Config:
        from_attributes = True

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    existing = await user_service.get_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado"
        )
    user = await user_service.create(db, payload)
    return user
```

```python
# services/user_service.py — lógica de negócio separada
class UserService:
    async def create(self, db: AsyncSession, data: UserCreate) -> User:
        hashed_password = hash_password(data.password)
        user = User(
            id=str(uuid.uuid4()),
            name=data.name,
            email=data.email.lower(),
            password_hash=hashed_password,
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
            return user
        except IntegrityError:
            await db.rollback()
            raise ValueError("Erro ao criar usuário: conflito de dados")
```

### Django — Framework full-stack

```python
# models.py — model com boas práticas
from django.db import models
import uuid

class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(
        max_length=20,
        choices=[("admin","Admin"),("user","User"),("viewer","Viewer")],
        default="user"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["email", "is_active"])]

    def __str__(self):
        return f"{self.name} <{self.email}>"
```

---

## 2. Java — Spring Boot {#java}

### Estrutura de projeto Spring Boot (Clean Architecture)

```
src/
├── main/java/com/empresa/app/
│   ├── domain/           # Entidades e interfaces de repositório
│   │   ├── model/
│   │   └── repository/
│   ├── application/      # Use cases / Services
│   │   └── service/
│   ├── infrastructure/   # Implementações de repositório, configs
│   │   ├── persistence/
│   │   └── config/
│   └── presentation/     # Controllers, DTOs, mappers
│       ├── controller/
│       └── dto/
└── test/
```

```java
// Controller com tratamento de erro completo
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable UUID id) {
        return userService.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @GetMapping
    public Page<UserResponse> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") @Max(100) int size
    ) {
        return userService.list(PageRequest.of(page, size));
    }
}
```

```java
// Global exception handler
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return ErrorResponse.of("not_found", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> Objects.requireNonNullElse(fe.getDefaultMessage(), "Inválido")
            ));
        return ErrorResponse.ofValidation(errors);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Unhandled error on {}: {}", req.getRequestURI(), ex.getMessage(), ex);
        return ErrorResponse.of("internal_error", "Erro inesperado. ID: " + MDC.get("traceId"));
    }
}
```

---

## 3. Node.js / TypeScript {#nodejs}

### Estrutura com Express + TypeScript

```typescript
// src/app.ts
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { userRouter } from './routes/users';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use('/api/v1/users', userRouter);
app.use(errorHandler);

export default app;
```

```typescript
// src/routes/users.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/UserService';
import { validate } from '../middleware/validate';

const router = Router();
const userService = new UserService();

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
});

router.post('/', validate(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

export { router as userRouter };
```

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
  }
  console.error('[Unhandled error]', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Erro inesperado. Nossa equipe foi notificada.',
  });
};
```

---

## 4. Go {#go}

```go
// main.go — API com chi router
package main

import (
    "context"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

func main() {
    r := chi.NewRouter()
    r.Use(middleware.RequestID)
    r.Use(middleware.RealIP)
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.Timeout(30 * time.Second))

    r.Route("/api/v1", func(r chi.Router) {
        r.Mount("/users", userHandler.Routes())
    })

    srv := &http.Server{
        Addr:    ":8080",
        Handler: r,
    }

    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("Server failed", "error", err)
            os.Exit(1)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
}
```

```go
// handlers/user.go
type UserHandler struct{ service UserService }

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondError(w, http.StatusBadRequest, "invalid_body", err.Error())
        return
    }
    if err := req.Validate(); err != nil {
        respondError(w, http.StatusUnprocessableEntity, "validation_error", err.Error())
        return
    }
    user, err := h.service.Create(r.Context(), req)
    if err != nil {
        handleServiceError(w, err)
        return
    }
    respondJSON(w, http.StatusCreated, user)
}
```

---

## 5. Kotlin — Spring Boot idiomático {#kotlin}

### Por que Kotlin além de "Java com sintaxe melhor"

```
Usar Kotlin só com estilo Java (null checks manuais, sem corrotinas, sem data class)
desperdiça a razão real de escolher a linguagem. O diferencial prático de Kotlin em
backend é: null-safety em tempo de compilação, corrotinas (concorrência mais barata
que threads da JVM tradicional) e data class/sealed class para modelagem de domínio
mais enxuta que o equivalente em Java puro.
```

### Estrutura de projeto — Spring Boot com Kotlin idiomático

```kotlin
// domain/Order.kt — data class + null-safety no próprio tipo
data class Order(
    val id: OrderId,
    val userId: UserId,
    val items: List<OrderItem>,
    val status: OrderStatus,
) {
    val totalCents: Long
        get() = items.sumOf { it.subtotalCents }

    fun addItem(item: OrderItem): Order {
        require(status == OrderStatus.DRAFT) { "Só é possível adicionar item a pedido em rascunho" }
        return copy(items = items + item) // imutabilidade — retorna cópia, nunca muta
    }
}

// Value classes (inline classes) — tipagem forte sem overhead de runtime
@JvmInline
value class OrderId(val value: String)

@JvmInline
value class UserId(val value: String)

// Sealed class — modela um conjunto FECHADO e exaustivo de estados
// O compilador OBRIGA tratar todo caso em um `when`, sem `else` escondendo bug
sealed class OrderStatus {
    object Draft : OrderStatus()
    object Submitted : OrderStatus()
    data class Cancelled(val reason: String) : OrderStatus()
    data class Delivered(val deliveredAt: Instant) : OrderStatus()
}

fun describeStatus(status: OrderStatus): String = when (status) {
    is OrderStatus.Draft -> "Em rascunho"
    is OrderStatus.Submitted -> "Enviado"
    is OrderStatus.Cancelled -> "Cancelado: ${status.reason}"
    is OrderStatus.Delivered -> "Entregue em ${status.deliveredAt}"
    // Sem `else` — se um novo subtipo de OrderStatus for adicionado e este `when`
    // não for atualizado, o build QUEBRA em tempo de compilação, não em produção
}
```

```kotlin
// application/CreateOrderUseCase.kt — corrotinas para I/O assíncrono sem callback hell
@Service
class CreateOrderUseCase(
    private val orderRepository: OrderRepository,
    private val productRepository: ProductRepository,
    private val eventPublisher: OrderEventPublisher,
) {
    // suspend = corrotina — muito mais barata que thread bloqueada da JVM tradicional
    // sob alta concorrência (milhares de requisições simultâneas esperando I/O)
    suspend fun execute(input: CreateOrderInput): CreateOrderResult = coroutineScope {
        // Chamadas independentes rodam em paralelo real, não sequencial
        val product = async { productRepository.findById(input.productId) }
        val user = async { userRepository.findById(input.userId) }

        val resolvedProduct = product.await() ?: throw NotFoundException("Product", input.productId)
        val resolvedUser = user.await() ?: throw NotFoundException("User", input.userId)

        val order = Order(
            id = OrderId(generateId()),
            userId = UserId(resolvedUser.id),
            items = listOf(OrderItem(resolvedProduct.id, input.quantity, resolvedProduct.priceCents)),
            status = OrderStatus.Draft,
        )

        orderRepository.save(order)
        eventPublisher.publish(OrderCreatedEvent(order))

        CreateOrderResult(order.id, order.totalCents)
    }
}
```

```kotlin
// api/OrderController.kt — controller suspenso, Spring WebFlux/coroutines nativo
@RestController
@RequestMapping("/api/v1/orders")
class OrderController(private val createOrderUseCase: CreateOrderUseCase) {

    @PostMapping
    suspend fun create(@RequestBody @Valid request: CreateOrderRequest): ResponseEntity<CreateOrderResponse> {
        val result = createOrderUseCase.execute(request.toInput())
        return ResponseEntity.status(HttpStatus.CREATED).body(result.toResponse())
    }

    // Tratamento de exceção centralizado, sem try/catch repetido em cada endpoint
    @ExceptionHandler(NotFoundException::class)
    suspend fun handleNotFound(ex: NotFoundException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse("not_found", ex.message))
}
```

```kotlin
// Repository com coroutines + R2DBC (driver reativo, não bloqueante)
@Repository
class R2dbcOrderRepository(private val client: DatabaseClient) : OrderRepository {

    override suspend fun findById(id: OrderId): Order? =
        client.sql("SELECT * FROM orders WHERE id = :id")
            .bind("id", id.value)
            .map { row, _ -> row.toOrder() }
            .awaitOneOrNull()

    override suspend fun save(order: Order) {
        client.sql("""
            INSERT INTO orders (id, user_id, status, total_cents)
            VALUES (:id, :userId, :status, :totalCents)
            ON CONFLICT (id) DO UPDATE SET status = :status
        """.trimIndent())
            .bind("id", order.id.value)
            .bind("userId", order.userId.value)
            .bind("status", order.status::class.simpleName)
            .bind("totalCents", order.totalCents)
            .await()
    }
}
```

### Null-safety — o que isso compra na prática

```kotlin
// ❌ Java-like — perde a vantagem de null-safety do Kotlin
fun getDiscountJavaStyle(order: Order?): Int {
    if (order == null) return 0
    if (order.coupon == null) return 0
    return order.coupon.discountCents  // NPE ainda possível se usado sem essa checagem
}

// ✅ Idiomático — o compilador GARANTE que discountCents só é acessado se não-nulo
fun getDiscount(order: Order?): Long =
    order?.coupon?.discountCents ?: 0L
    // safe call (?.) + elvis operator (?:) — se qualquer parte da cadeia for null,
    // resultado é 0L, sem exceção em runtime e sem `if` aninhado
```

### Testes — idiomático com MockK e Kotest

```kotlin
class CreateOrderUseCaseTest : FunSpec({
    val orderRepository = mockk<OrderRepository>()
    val productRepository = mockk<ProductRepository>()
    val useCase = CreateOrderUseCase(orderRepository, productRepository, mockk(relaxed = true))

    test("cria pedido quando produto e usuário existem") {
        coEvery { productRepository.findById(any()) } returns testProduct()
        coEvery { orderRepository.save(any()) } just Runs

        val result = useCase.execute(testCreateOrderInput())

        result.totalCents shouldBe 15000L
        coVerify(exactly = 1) { orderRepository.save(any()) }
    }

    test("lança NotFoundException quando produto não existe") {
        coEvery { productRepository.findById(any()) } returns null

        shouldThrow<NotFoundException> {
            useCase.execute(testCreateOrderInput())
        }
    }
})
```

### Quando escolher Kotlin vs Java puro

| Cenário | Recomendação |
|---|---|
| Time já domina Java, sem urgência de migrar | Java (Spring Boot) — trocar de linguagem tem custo de curva de aprendizado real |
| Modelagem de domínio rica com estados fechados (sealed class) | Kotlin — `sealed class` + `when` exaustivo é mais seguro que enum + switch do Java |
| Alta concorrência de I/O (milhares de chamadas simultâneas a APIs externas) | Kotlin com corrotinas — mais barato que thread-per-request da JVM tradicional |
| Interop pesado com biblioteca Java legada específica | Java — Kotlin interopera bem, mas nuances de nulidade em bibliotecas Java antigas exigem anotação cuidadosa |

---

## 6. C# (.NET) {#csharp}

### Estrutura de projeto — Minimal API + Clean Architecture (.NET 8)

```csharp
// Domain/Order.cs — record para imutabilidade, igual data class do Kotlin
public sealed record Order
{
    public required OrderId Id { get; init; }
    public required UserId UserId { get; init; }
    public required IReadOnlyList<OrderItem> Items { get; init; }
    public required OrderStatus Status { get; init; }

    public long TotalCents => Items.Sum(i => i.SubtotalCents);

    public Order AddItem(OrderItem item)
    {
        if (Status != OrderStatus.Draft)
            throw new DomainException("Só é possível adicionar item a pedido em rascunho");

        return this with { Items = [.. Items, item] }; // imutável — retorna cópia
    }
}

// Strongly-typed IDs — evita passar um Guid de usuário no lugar de um Guid de pedido por engano
public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
}

// Enum tradicional funciona, mas para estado com DADOS associados, prefira este padrão:
public abstract record OrderStatus
{
    public sealed record Draft : OrderStatus;
    public sealed record Submitted : OrderStatus;
    public sealed record Cancelled(string Reason) : OrderStatus;
    public sealed record Delivered(DateTimeOffset DeliveredAt) : OrderStatus;
}

// Pattern matching exaustivo — C# não força exaustividade como o `when` do Kotlin,
// mas o analisador do Roslyn AVISA (warning) se um branch de sealed record faltar
public static string DescribeStatus(OrderStatus status) => status switch
{
    OrderStatus.Draft => "Em rascunho",
    OrderStatus.Submitted => "Enviado",
    OrderStatus.Cancelled c => $"Cancelado: {c.Reason}",
    OrderStatus.Delivered d => $"Entregue em {d.DeliveredAt}",
    _ => throw new UnreachableException(), // torna explícito que todo caso deveria estar coberto acima
};
```

```csharp
// Application/CreateOrderUseCase.cs — async/await nativo, sem callback
public sealed class CreateOrderUseCase(
    IOrderRepository orderRepository,
    IProductRepository productRepository,
    IOrderEventPublisher eventPublisher)
{
    public async Task<CreateOrderResult> ExecuteAsync(CreateOrderInput input, CancellationToken ct)
    {
        // Chamadas independentes em paralelo real — Task.WhenAll, não sequencial
        var productTask = productRepository.FindByIdAsync(input.ProductId, ct);
        var userTask = userRepository.FindByIdAsync(input.UserId, ct);
        await Task.WhenAll(productTask, userTask);

        var product = await productTask ?? throw new NotFoundException(nameof(Product), input.ProductId);
        var user = await userTask ?? throw new NotFoundException(nameof(User), input.UserId);

        var order = new Order
        {
            Id = OrderId.New(),
            UserId = user.Id,
            Items = [new OrderItem(product.Id, input.Quantity, product.PriceCents)],
            Status = new OrderStatus.Draft(),
        };

        await orderRepository.SaveAsync(order, ct);
        await eventPublisher.PublishAsync(new OrderCreatedEvent(order), ct);

        return new CreateOrderResult(order.Id, order.TotalCents);
    }
}
```

```csharp
// Api/OrderEndpoints.cs — Minimal API (.NET 8), sem o overhead de Controller/MVC
// quando o projeto não precisa de toda a maquinaria do MVC tradicional
public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/orders").WithTags("Orders");

        group.MapPost("/", async (
            CreateOrderRequest request,
            CreateOrderUseCase useCase,
            CancellationToken ct) =>
        {
            var result = await useCase.ExecuteAsync(request.ToInput(), ct);
            return Results.Created($"/api/v1/orders/{result.OrderId}", result.ToResponse());
        })
        .WithValidation<CreateOrderRequest>() // validação via FluentValidation, não if manual
        .Produces<CreateOrderResponse>(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}

// Program.cs — tratamento de exceção centralizado (Middleware), não try/catch por endpoint
app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var (status, error) = exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "not_found"),
            DomainException => (StatusCodes.Status400BadRequest, "domain_error"),
            _ => (StatusCodes.Status500InternalServerError, "internal_error"),
        };
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new { error, message = exception?.Message });
    });
});
```

```csharp
// Infrastructure/EfOrderRepository.cs — Entity Framework Core com query assíncrona
public sealed class EfOrderRepository(AppDbContext db) : IOrderRepository
{
    public async Task<Order?> FindByIdAsync(OrderId id, CancellationToken ct) =>
        await db.Orders
            .AsNoTracking() // leitura sem tracking de mudanças — mais rápido quando não vai atualizar
            .Where(o => o.Id == id)
            .FirstOrDefaultAsync(ct);

    public async Task SaveAsync(Order order, CancellationToken ct)
    {
        db.Orders.Update(order);
        await db.SaveChangesAsync(ct); // uma única viagem ao banco, ACID por transação implícita
    }
}
```

### Nullable Reference Types — o equivalente C# de null-safety

```csharp
// Program.cs ou .csproj: <Nullable>enable</Nullable> — obrigatório em projeto novo
// Com isso ativo, o compilador avisa (warning, escalável a erro) sobre uso de
// referência potencialmente nula sem checagem

public class OrderService
{
    // string (sem ?) = compilador espera que NUNCA seja nulo
    // string? (com ?) = pode ser nulo, e o compilador cobra tratamento antes de usar
    public string DescribeCoupon(Coupon? coupon)
    {
        return coupon?.Code ?? "sem cupom";
        // Sem o `?.` e `??`, o compilador avisa: "Dereference of a possibly null reference"
    }
}
```

### Testes — xUnit + FluentAssertions + NSubstitute

```csharp
public class CreateOrderUseCaseTests
{
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly CreateOrderUseCase _useCase;

    public CreateOrderUseCaseTests()
    {
        _useCase = new CreateOrderUseCase(_orderRepository, _productRepository, Substitute.For<IOrderEventPublisher>());
    }

    [Fact]
    public async Task Deve_criar_pedido_quando_produto_e_usuario_existem()
    {
        _productRepository.FindByIdAsync(Arg.Any<ProductId>(), Arg.Any<CancellationToken>())
            .Returns(TestData.Product());

        var result = await _useCase.ExecuteAsync(TestData.CreateOrderInput(), CancellationToken.None);

        result.TotalCents.Should().Be(15000);
        await _orderRepository.Received(1).SaveAsync(Arg.Any<Order>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Deve_lancar_NotFoundException_quando_produto_nao_existe()
    {
        _productRepository.FindByIdAsync(Arg.Any<ProductId>(), Arg.Any<CancellationToken>())
            .Returns((Product?)null);

        var act = async () => await _useCase.ExecuteAsync(TestData.CreateOrderInput(), CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
```

### Quando escolher C#/.NET

| Cenário | Recomendação |
|---|---|
| Organização já usa stack Microsoft (Azure, Active Directory, SQL Server) | C#/.NET — integração nativa reduz atrito operacional |
| Precisa de Minimal API leve sem overhead de MVC completo | .NET 8 Minimal API — menos boilerplate que Controller tradicional |
| Time vem de linguagem dinamicamente tipada, quer tipagem forte com curva suave | C# — sintaxe mais próxima de Java/TypeScript que Kotlin/Rust |
| Sistema legado já em .NET Framework (não Core) | Avaliar migração incremental para .NET 8 antes de adicionar funcionalidade nova — não continue expandindo Framework antigo sem necessidade |

---

## 7. Estruturas de Dados e Big O {#dsa}

### Complexidades essenciais

| Estrutura | Acesso | Busca | Inserção | Remoção |
|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) |
| HashMap | O(1) | O(1) avg | O(1) avg | O(1) avg |
| Linked List | O(n) | O(n) | O(1) | O(1) |
| Binary Search Tree | O(log n) | O(log n) | O(log n) | O(log n) |
| Heap | O(1) top | O(n) | O(log n) | O(log n) |

### Padrões de algoritmo mais usados no backend
- **Sliding Window**: rate limiting, detecção de anomalias em stream
- **Two Pointers**: deduplicação eficiente, merge de listas ordenadas
- **Binary Search**: lookup em listas ordenadas (ex: planos de preço, tiers)
- **BFS/DFS**: resolver dependências, grafos de permissões, hierarquias
- **Dynamic Programming**: cálculo de preços com regras complexas, memoização

---

## 8. Protocolos de Internet {#protocols}

### HTTP/HTTPS
- **Métodos semânticos**: GET (idempotente, cacheable) / POST / PUT (idempotente) / PATCH / DELETE
- **Status codes corretos**: 200 / 201 / 204 / 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500 / 503
- **Headers importantes**: `Authorization`, `Content-Type`, `ETag`, `Cache-Control`, `X-Request-ID`
- **TLS**: sempre HTTPS em produção; HSTS habilitado; TLS 1.2+ apenas

### WebSockets
```typescript
// Exemplo: WebSocket server com autenticação JWT
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
    const token = extractTokenFromRequest(req);
    const user = verifyJWT(token);
    if (!user) {
        ws.close(4001, 'Unauthorized');
        return;
    }

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        handleMessage(user, message, ws);
    });

    ws.on('close', () => cleanupUserSession(user.id));
    
    // Heartbeat para detectar conexões mortas
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
});

// Ping periódico para manter conexão viva
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30_000);
```

### DNS e Latência de Rede
- Prefira IPs fixos para serviços internos (evitar overhead de DNS em hot path)
- Configure TTL adequado: valores curtos para IPs que mudam, longos para estáticos
- Use Connection Pooling em clientes HTTP e banco de dados (nunca abra conexão por request)
