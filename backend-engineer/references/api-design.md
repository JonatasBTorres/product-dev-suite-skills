# Design de APIs — REST e GraphQL

## Sumário
1. [Princípios REST](#rest)
2. [Contratos e Padrões de Response](#contracts)
3. [Versionamento](#versioning)
4. [GraphQL](#graphql)
5. [Documentação com OpenAPI/Swagger](#openapi)
6. [Webhooks](#webhooks)
7. [Contract Testing com Pact](#contract-testing)
8. [Linting de schema com Spectral](#spectral)
9. [Schema Registry — Avro e Protobuf](#schema-registry)

---

## 1. Princípios REST {#rest}

### Nomenclatura de recursos

```
✅ Correto — substantivos no plural, hierarquia clara:
GET    /api/v1/users              → listar usuários
POST   /api/v1/users              → criar usuário
GET    /api/v1/users/{id}         → buscar por ID
PUT    /api/v1/users/{id}         → substituir completamente
PATCH  /api/v1/users/{id}         → atualizar parcialmente
DELETE /api/v1/users/{id}         → remover
GET    /api/v1/users/{id}/orders  → pedidos de um usuário
POST   /api/v1/orders/{id}/cancel → ação em recurso (verbo como subrecurso)

❌ Incorreto:
GET  /api/v1/getUser              → verbo na URL
POST /api/v1/user/create          → redundante
GET  /api/v1/user                 → singular inconsistente
POST /api/v1/deleteOrder          → método errado para deleção
```

### Status HTTP — quando usar cada um

```
2xx — Sucesso
200 OK           → GET, PUT, PATCH com body de retorno
201 Created      → POST que criou recurso (incluir Location header)
204 No Content   → DELETE, PUT/PATCH sem body de retorno
206 Partial      → GET com range (downloads, streaming)

4xx — Erro do cliente
400 Bad Request          → JSON mal formado, tipo errado
401 Unauthorized         → Token ausente ou inválido (não autenticado)
403 Forbidden            → Autenticado mas sem permissão
404 Not Found            → Recurso não existe
405 Method Not Allowed   → Método HTTP não suportado na rota
409 Conflict             → Conflito de estado (ex: e-mail duplicado)
410 Gone                 → Recurso deletado permanentemente
422 Unprocessable Entity → Validação de negócio falhou
429 Too Many Requests    → Rate limit atingido

5xx — Erro do servidor
500 Internal Server Error → Erro inesperado não tratado
502 Bad Gateway           → Serviço upstream indisponível
503 Service Unavailable   → Serviço temporariamente fora
504 Gateway Timeout       → Timeout em serviço upstream
```

---

## 2. Contratos e Padrões de Response {#contracts}

### Response de sucesso — lista paginada

```json
{
  "data": [
    {
      "id": "usr_abc123",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "role": "user",
      "createdAt": "2025-03-06T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Response de sucesso — item único

```json
{
  "data": {
    "id": "usr_abc123",
    "name": "João Silva",
    "email": "joao@exemplo.com"
  }
}
```

### Response de erro — padrão consistente

```json
{
  "error": {
    "code": "validation_error",
    "message": "Dados inválidos na requisição",
    "requestId": "req_xyz789",
    "timestamp": "2025-03-06T14:30:00Z",
    "details": {
      "fields": {
        "email": "Formato de e-mail inválido",
        "name": "Mínimo 2 caracteres"
      }
    }
  }
}
```

### Headers importantes

```http
# Request
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json
X-Request-ID: req_xyz789
X-Idempotency-Key: idem_abc123  # para POST idempotentes

# Response
Content-Type: application/json; charset=utf-8
X-Request-ID: req_xyz789        # ecoar o request ID
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1741270200
ETag: "abc123"                  # para cache condicional
Cache-Control: no-store         # para dados sensíveis
Location: /api/v1/users/usr_abc123  # após POST 201
```

### Idempotência em POST

```typescript
// Idempotency key: previne duplo processamento
async function createOrder(
    idempotencyKey: string,
    data: CreateOrderData
): Promise<Order> {
    // Verificar se já existe resultado para esta key
    const existing = await redis.get(`idempotency:${idempotencyKey}`);
    if (existing) return JSON.parse(existing);
    
    // Processar
    const order = await orderService.create(data);
    
    // Salvar resultado (TTL: 24h)
    await redis.setEx(
        `idempotency:${idempotencyKey}`,
        86400,
        JSON.stringify(order)
    );
    return order;
}
```

---

## 3. Versionamento {#versioning}

```
Estratégias de versionamento:

1. URL path (recomendado para breaking changes):
   /api/v1/users → /api/v2/users

2. Header (mais limpo, menos visível):
   Accept: application/vnd.myapi.v2+json

3. Query param (evitar — não é semântico):
   /api/users?version=2

Política de deprecação:
- Anunciar breaking change com mínimo 6 meses de antecedência
- Manter v1 funcionando durante o período de transição
- Adicionar header Deprecation: true e Sunset: [data] nas responses
- Documentar migration guide v1→v2
```

---

## 4. GraphQL {#graphql}

```graphql
# Schema definition — tipagem forte
type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    orders(first: Int, after: String): OrderConnection!
    createdAt: DateTime!
}

enum UserRole { ADMIN USER VIEWER }

type OrderConnection {
    edges: [OrderEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
}

type OrderEdge {
    node: Order!
    cursor: String!
}

type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
}

type Query {
    user(id: ID!): User
    users(first: Int, after: String, filter: UserFilter): UserConnection!
}

type Mutation {
    createUser(input: CreateUserInput!): CreateUserPayload!
    updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
}

# Mutations com payload (inclui erros no schema)
type CreateUserPayload {
    user: User
    errors: [UserError!]!
}

type UserError {
    field: String
    code: String!
    message: String!
}
```

```typescript
// Resolver com DataLoader para resolver N+1
import DataLoader from 'dataloader';

// Cria um DataLoader por request (não global!)
function createLoaders() {
    return {
        userById: new DataLoader(async (ids: readonly string[]) => {
            const users = await db.users.findMany({ where: { id: { in: [...ids] } } });
            const map = new Map(users.map(u => [u.id, u]));
            return ids.map(id => map.get(id) ?? null);
        }),
        ordersByUserId: new DataLoader(async (userIds: readonly string[]) => {
            const orders = await db.orders.findMany({
                where: { userId: { in: [...userIds] } }
            });
            const grouped = groupBy(orders, o => o.userId);
            return userIds.map(id => grouped[id] ?? []);
        })
    };
}

// Resolver — usa DataLoader ao invés de query individual
const resolvers = {
    User: {
        orders: (user, args, { loaders }) =>
            loaders.ordersByUserId.load(user.id)
    }
};
```

---

## 5. OpenAPI / Swagger {#openapi}

```yaml
# openapi.yaml — documentação que gera cliente automaticamente
openapi: '3.0.3'
info:
  title: My API
  version: '1.0.0'
  description: API principal do sistema

servers:
  - url: https://api.meuapp.com/v1
    description: Produção
  - url: https://api.staging.meuapp.com/v1
    description: Staging

paths:
  /users:
    post:
      summary: Criar usuário
      operationId: createUser
      tags: [Users]
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: Usuário criado com sucesso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'

components:
  schemas:
    CreateUserRequest:
      type: object
      required: [name, email, role]
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 100
          example: João Silva
        email:
          type: string
          format: email
          example: joao@exemplo.com
        role:
          type: string
          enum: [admin, user, viewer]

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## 6. Webhooks {#webhooks}

```typescript
// Entregando webhooks com retry e verificação de assinatura

// Assinar payload (sender)
function signWebhook(payload: object, secret: string): string {
    const body = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return `sha256=${signature}`;
}

// Verificar assinatura (receiver)
function verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
): boolean {
    const expected = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')}`;
    // Comparação segura (timing-safe)
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}

// Delivery com retry exponencial
async function deliverWebhook(
    url: string,
    event: WebhookEvent,
    attempt = 1
): Promise<void> {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signWebhook(event, secret),
                'X-Webhook-Event': event.type,
                'X-Delivery-ID': event.deliveryId,
            },
            body: JSON.stringify(event),
            signal: AbortSignal.timeout(10_000), // 10s timeout
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
    } catch (err) {
        if (attempt < 5) {
            // Backoff exponencial: 1min, 2min, 4min, 8min
            const delay = Math.pow(2, attempt - 1) * 60_000;
            await scheduleRetry(url, event, attempt + 1, delay);
        } else {
            await markDeliveryFailed(event.deliveryId, String(err));
        }
    }
}
```

---

## 7. Contract Testing com Pact {#contract-testing}

### Por que contract testing além de testes de integração normais

```
Problema que resolve: em microsserviços, o time do consumidor (ex: frontend
ou Orders Service) e o time do provider (ex: Payments Service) evoluem em
ritmos diferentes. Um teste de integração tradicional só roda contra um
ambiente onde o provider real está no ar — lento e frágil (depende de deploy
de outro time para rodar).

Contract testing (Pact) inverte isso:
1. O CONSUMIDOR define o contrato: "eu espero que GET /orders/{id} retorne
   este formato de JSON com estes campos"
2. Esse contrato vira um arquivo (pact file), publicado num broker
3. O PROVIDER roda esse contrato contra sua implementação REAL no CI dele
4. Se o provider quebrar o contrato, o CI do provider falha — ANTES de ele
   fazer deploy e quebrar o consumidor em produção
```

### Lado consumidor — definindo a expectativa

```typescript
// consumer.pact.test.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
const { like, eachLike } = MatchersV3;

const provider = new PactV3({
    consumer: 'OrdersWebApp',
    provider: 'PaymentsService',
});

describe('GET /payments/{orderId}', () => {
    it('retorna o status do pagamento', async () => {
        provider
            .given('um pagamento existe para o pedido 123')
            .uponReceiving('uma requisição de status de pagamento')
            .withRequest({ method: 'GET', path: '/payments/123' })
            .willRespondWith({
                status: 200,
                body: {
                    orderId: like('123'),
                    status: like('approved'),
                    amountCents: like(15000),
                    processedAt: like('2026-01-15T10:00:00Z'),
                },
            });

        await provider.executeTest(async (mockServer) => {
            const client = new PaymentsClient(mockServer.url);
            const result = await client.getPaymentStatus('123');
            expect(result.status).toBe('approved');
        });
    });
});
```

### Lado provider — verificando o contrato

```typescript
// provider.pact.verify.ts — roda no CI do time de Payments
import { Verifier } from '@pact-foundation/pact';

describe('Payments Service — Pact Verification', () => {
    it('cumpre os contratos publicados no broker', () => {
        return new Verifier({
            provider: 'PaymentsService',
            providerBaseUrl: 'http://localhost:3001',
            pactBrokerUrl: process.env.PACT_BROKER_URL,
            pactBrokerToken: process.env.PACT_BROKER_TOKEN,
            publishVerificationResult: true,
            providerVersion: process.env.GIT_SHA,
            stateHandlers: {
                'um pagamento existe para o pedido 123': async () => {
                    await seedTestPayment({ orderId: '123', status: 'approved' });
                },
            },
        }).verifyProvider();
    });
});
```

```yaml
# CI do provider — falha o build se quebrar contrato de QUALQUER consumidor
- name: Verify Pact contracts
  run: npm run test:pact:verify

# can-i-deploy — bloqueia deploy se a versão quebra contratos ainda não verificados
- name: Check if safe to deploy
  run: |
    npx pact-broker can-i-deploy \
      --pacticipant PaymentsService \
      --version ${{ github.sha }} \
      --to-environment production
```

### Checklist de contract testing
- [ ] Todo consumidor de API interna publica seu Pact no broker compartilhado
- [ ] Todo provider roda verificação de Pact no próprio CI, não no CI do consumidor
- [ ] `can-i-deploy` como gate obrigatório antes de deploy em produção
- [ ] Contratos versionados por branch/ambiente (não só por versão de app)

---

## 8. Linting de schema com Spectral {#spectral}

### Validação automática de OpenAPI antes de virar código

```yaml
# .spectral.yml — regras customizadas de governança de API
extends: ["spectral:oas"]

rules:
  # Toda operação deve ter operationId (necessário para geração de SDK)
  operation-operationId: error

  # Toda resposta de erro deve seguir o envelope padrão da empresa
  error-response-schema:
    given: "$.paths.*.*.responses[?(@property >= '400')]"
    then:
      field: content.application/json.schema.properties.error
      function: truthy
    message: "Respostas de erro devem ter campo 'error' seguindo o envelope padrão"

  # Proibir versionamento inconsistente na URL
  path-must-have-version:
    given: "$.paths[*]~"
    then:
      function: pattern
      functionOptions:
        match: "^/v[0-9]+/"
    message: "Todo path deve começar com /v{n}/ (versionamento explícito)"

  # Nomes de propriedade devem ser camelCase (consistência de contrato)
  property-casing:
    given: "$.paths..properties[*]~"
    then:
      function: casing
      functionOptions: { type: camel }
```

```bash
# Rodar no CI antes de mergear qualquer mudança de contrato de API
spectral lint openapi.yaml --fail-severity error

# Integração com PR — comenta violações diretamente no diff
spectral lint openapi.yaml -f json | spectral-github-action
```

```yaml
# GitHub Actions — gate de qualidade de contrato antes de mergear
- name: Lint OpenAPI spec
  run: npx spectral lint openapi/api.yaml --fail-severity=error
```

---

## 9. Schema Registry — Avro e Protobuf {#schema-registry}

### Por que Schema Registry além de JSON solto em filas

```
Problema: em mensageria (Kafka, etc.), sem um contrato formal, um producer
pode mudar o formato do evento e quebrar silenciosamente todos os consumers
— só descobrem em produção, quando a mensagem já foi publicada.

Schema Registry resolve isso:
1. Todo schema de evento é registrado centralmente (Confluent Schema Registry,
   AWS Glue Schema Registry, ou similar)
2. Producer serializa a mensagem JÁ validando contra o schema registrado
3. Consumer deserializa esperando aquele schema — incompatibilidade falha
   ANTES de processar dados corrompidos/inesperados
4. Compatibilidade é validada no momento do REGISTRO do novo schema, não em runtime
```

### Modos de compatibilidade

| Modo | Regra | Quando usar |
|---|---|---|
| **BACKWARD** | Novo schema lê dados escritos com schema antigo | Consumer atualiza antes do producer (mais comum) |
| **FORWARD** | Schema antigo lê dados escritos com novo schema | Producer atualiza antes de todos os consumers |
| **FULL** | Backward E Forward simultaneamente | Máxima segurança — recomendado para eventos com muitos consumers heterogêneos |
| **NONE** | Sem validação | Nunca usar em produção |

### Avro — schema e evolução

```json
// schemas/order-created-v1.avsc
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.minhaempresa.orders",
  "fields": [
    { "name": "orderId", "type": "string" },
    { "name": "userId", "type": "string" },
    { "name": "totalCents", "type": "long" },
    { "name": "currency", "type": "string", "default": "BRL" }
  ]
}
```

```json
// schemas/order-created-v2.avsc — evolução BACKWARD-compatible
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.minhaempresa.orders",
  "fields": [
    { "name": "orderId", "type": "string" },
    { "name": "userId", "type": "string" },
    { "name": "totalCents", "type": "long" },
    { "name": "currency", "type": "string", "default": "BRL" },
    { "name": "discountCents", "type": ["null", "long"], "default": null }
  ]
}
// ✅ Compatível: campo novo tem "default" — consumer com schema v1
//    ainda consegue ler mensagens v2 (ignora o campo novo)
// ❌ Quebraria compatibilidade: remover um campo existente, ou adicionar
//    campo obrigatório sem default
```

```typescript
// Producer — serializa validando contra o Schema Registry
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

const registry = new SchemaRegistry({ host: process.env.SCHEMA_REGISTRY_URL });

async function publishOrderCreated(order: Order) {
    const schemaId = await registry.getLatestSchemaId('orders-order-created-value');
    const encodedPayload = await registry.encode(schemaId, {
        orderId: order.id,
        userId: order.userId,
        totalCents: order.totalCents,
        currency: order.currency,
    });
    await kafkaProducer.send({
        topic: 'orders.events',
        messages: [{ value: encodedPayload }],
    });
}

// Consumer — decodifica e valida automaticamente contra o schema registrado
async function consumeOrderCreated(message: KafkaMessage) {
    const decoded = await registry.decode(message.value);
    // decoded já vem no formato validado — se o schema for incompatível,
    // o decode falha explicitamente ao invés de silenciosamente corromper dados
}
```

### Protobuf — alternativa com tipagem mais forte em runtime

```protobuf
// schemas/order.proto
syntax = "proto3";
package orders.v1;

message OrderCreated {
  string order_id = 1;
  string user_id = 2;
  int64 total_cents = 3;
  string currency = 4;
  optional int64 discount_cents = 5;  // campo novo, opcional = compatível
}
```

```bash
# Validar compatibilidade ANTES de registrar novo schema (buf é a ferramenta padrão)
buf breaking schemas/ --against '.git#branch=main'
# Falha o CI se a mudança quebrar compatibilidade com o schema em produção
```

### Checklist de Schema Registry
- [ ] Modo de compatibilidade FULL para eventos com múltiplos consumers desconhecidos
- [ ] Validação de compatibilidade roda no CI, antes do merge (não depois, em produção)
- [ ] Campos novos sempre com valor default (nunca obrigatórios sem default)
- [ ] Nunca remover ou renomear campo existente — depreciar e manter por um período de transição
