# Testes — Unitários, Integração e E2E

## Sumário
1. [Pirâmide de testes](#pyramid)
2. [Testes unitários](#unit)
3. [Testes de integração](#integration)
4. [Testes E2E](#e2e)
5. [TDD — Test Driven Development](#tdd)
6. [Mocks, Stubs e Spies](#mocks)
7. [Coverage e métricas](#coverage)

---

## 1. Pirâmide de testes {#pyramid}

```
        /\
       /E2E\       → Poucos, lentos, testam fluxos completos
      /______\
     /Integração\  → Médios, testam módulos + infra (banco, HTTP)
    /____________\
   /  Unitários   \ → Muitos, rápidos, testam lógica isolada
  /________________\

Distribuição recomendada:
- 70% unitários
- 20% integração
- 10% E2E
```

---

## 2. Testes unitários {#unit}

### Node.js com Vitest (recomendado) ou Jest

```typescript
// src/services/user.service.ts
export class UserService {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly emailService: EmailService
    ) {}

    async createUser(data: CreateUserInput): Promise<User> {
        const existing = await this.userRepo.findByEmail(data.email);
        if (existing) throw new ConflictError('E-mail já cadastrado');

        const user = await this.userRepo.create({
            ...data,
            email: data.email.toLowerCase(),
            role: 'user',
        });
        await this.emailService.sendWelcome(user.email, user.name);
        return user;
    }
}

// src/services/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UserService', () => {
    let service: UserService;
    let mockUserRepo: vi.Mocked<UserRepository>;
    let mockEmailService: vi.Mocked<EmailService>;

    beforeEach(() => {
        mockUserRepo = {
            findByEmail: vi.fn(),
            create: vi.fn(),
        } as any;
        mockEmailService = { sendWelcome: vi.fn() } as any;
        service = new UserService(mockUserRepo, mockEmailService);
    });

    describe('createUser', () => {
        it('deve criar usuário com sucesso', async () => {
            // Arrange
            mockUserRepo.findByEmail.mockResolvedValue(null);
            const createdUser = { id: 'usr_1', name: 'João', email: 'joao@ex.com', role: 'user' };
            mockUserRepo.create.mockResolvedValue(createdUser);
            mockEmailService.sendWelcome.mockResolvedValue(undefined);

            // Act
            const result = await service.createUser({
                name: 'João',
                email: 'JOAO@EX.COM', // testar normalização
            });

            // Assert
            expect(result).toEqual(createdUser);
            expect(mockUserRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'joao@ex.com',  // deve normalizar para lowercase
                    role: 'user',           // role deve ser definida pelo sistema
                })
            );
            expect(mockEmailService.sendWelcome).toHaveBeenCalledWith('joao@ex.com', 'João');
        });

        it('deve lançar ConflictError se e-mail já existe', async () => {
            mockUserRepo.findByEmail.mockResolvedValue({ id: 'usr_existing' } as User);

            await expect(service.createUser({ name: 'João', email: 'joao@ex.com' }))
                .rejects
                .toThrow(ConflictError);

            // Garantir que não criou usuário nem enviou e-mail
            expect(mockUserRepo.create).not.toHaveBeenCalled();
            expect(mockEmailService.sendWelcome).not.toHaveBeenCalled();
        });

        it('deve propagar erro se o repositório falhar', async () => {
            mockUserRepo.findByEmail.mockResolvedValue(null);
            mockUserRepo.create.mockRejectedValue(new Error('DB connection failed'));

            await expect(service.createUser({ name: 'João', email: 'joao@ex.com' }))
                .rejects
                .toThrow('DB connection failed');
        });
    });
});
```

### Python com pytest

```python
# tests/test_user_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.user_service import UserService
from app.exceptions import ConflictError

@pytest.fixture
def mock_user_repo():
    return AsyncMock()

@pytest.fixture
def mock_email_service():
    return AsyncMock()

@pytest.fixture
def user_service(mock_user_repo, mock_email_service):
    return UserService(repo=mock_user_repo, email_service=mock_email_service)

class TestCreateUser:
    async def test_create_user_success(self, user_service, mock_user_repo, mock_email_service):
        mock_user_repo.find_by_email.return_value = None
        mock_user_repo.create.return_value = {"id": "usr_1", "email": "joao@ex.com"}

        result = await user_service.create_user({"name": "João", "email": "JOAO@EX.COM"})

        assert result["id"] == "usr_1"
        mock_user_repo.create.assert_called_once_with(
            pytest.approx({"name": "João", "email": "joao@ex.com", "role": "user"}, abs=0)
        )
        mock_email_service.send_welcome.assert_called_once()

    async def test_conflict_on_duplicate_email(self, user_service, mock_user_repo):
        mock_user_repo.find_by_email.return_value = {"id": "existing"}

        with pytest.raises(ConflictError, match="E-mail já cadastrado"):
            await user_service.create_user({"name": "João", "email": "joao@ex.com"})

        mock_user_repo.create.assert_not_called()
```

---

## 3. Testes de integração {#integration}

```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/database';

describe('POST /api/v1/users', () => {
    beforeAll(async () => {
        await db.migrate.latest();
    });

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await db.seed.run(); // ou truncate + seed
    });

    it('201 — cria usuário com dados válidos', async () => {
        const res = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'João Silva', email: 'joao@test.com', role: 'user' });

        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({
            name: 'João Silva',
            email: 'joao@test.com',
        });
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).not.toHaveProperty('password_hash'); // dado sensível nunca exposto

        // Verificar persistência no banco
        const persisted = await db('users').where('email', 'joao@test.com').first();
        expect(persisted).toBeTruthy();
    });

    it('409 — conflito quando e-mail já existe', async () => {
        await db('users').insert({ name: 'Existente', email: 'dup@test.com', role: 'user' });

        const res = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Novo', email: 'dup@test.com', role: 'user' });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('conflict');
    });

    it('401 — não autenticado', async () => {
        const res = await request(app)
            .post('/api/v1/users')
            .send({ name: 'João', email: 'joao@test.com' });

        expect(res.status).toBe(401);
    });

    it('403 — usuário sem permissão de admin', async () => {
        const res = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${userToken}`) // role: user
            .send({ name: 'João', email: 'joao@test.com', role: 'admin' });

        expect(res.status).toBe(403);
    });
});
```

---

## 4. Testes E2E {#e2e}

```typescript
// e2e/checkout.spec.ts com Playwright
import { test, expect } from '@playwright/test';

test.describe('Fluxo de checkout', () => {
    test('usuário completa uma compra com sucesso', async ({ request }) => {
        // 1. Criar conta
        const signup = await request.post('/api/v1/auth/signup', {
            data: { name: 'Test User', email: 'test@e2e.com', password: 'Test1234!' }
        });
        expect(signup.status()).toBe(201);
        const { data: { accessToken } } = await signup.json();

        // 2. Adicionar item ao carrinho
        const cart = await request.post('/api/v1/cart/items', {
            headers: { Authorization: `Bearer ${accessToken}` },
            data: { productId: 'prod_test_123', quantity: 2 }
        });
        expect(cart.status()).toBe(201);

        // 3. Finalizar checkout
        const checkout = await request.post('/api/v1/orders', {
            headers: { Authorization: `Bearer ${accessToken}` },
            data: {
                paymentMethod: 'credit_card',
                cardToken: 'tok_visa_test'
            }
        });
        expect(checkout.status()).toBe(201);
        const order = await checkout.json();
        expect(order.data.status).toBe('processing');
        expect(order.data.totalCents).toBe(19800); // 2 × R$ 99,00
    });
});
```

---

## 5. TDD — Test Driven Development {#tdd}

```
Ciclo Red → Green → Refactor:

1. RED: Escreva um teste que FALHA (a funcionalidade ainda não existe)
2. GREEN: Escreva o MÍNIMO de código para o teste passar
3. REFACTOR: Melhore o código sem quebrar os testes

Quando usar TDD:
✅ Lógica de negócio complexa com muitas regras
✅ Algoritmos que precisam de edge cases cobertos
✅ Funções puras (sem side effects)

Quando TDD pode ser menos útil:
⚠️ CRUD simples sem regras de negócio
⚠️ Integrações com sistemas externos (prefira integration tests)
⚠️ Exploração inicial de uma API nova
```

---

## 6. Mocks, Stubs e Spies {#mocks}

```typescript
// Mock: substituição completa com controle total
const mockEmailService = { sendWelcome: vi.fn().mockResolvedValue(undefined) };

// Stub: retorno fixo para uma chamada específica
mockRepo.findById.mockResolvedValueOnce({ id: '1', name: 'João' });

// Spy: monitora chamadas sem substituir comportamento
const emailSpy = vi.spyOn(realEmailService, 'sendWelcome');
// ... código que chama ...
expect(emailSpy).toHaveBeenCalledTimes(1);
expect(emailSpy).toHaveBeenCalledWith('joao@ex.com', 'João');

// Limpar mocks entre testes
afterEach(() => { vi.clearAllMocks(); });
afterAll(() => { vi.restoreAllMocks(); });
```

---

## 7. Coverage e Métricas {#coverage}

```json
// vitest.config.ts — metas de coverage
{
  "coverage": {
    "provider": "v8",
    "thresholds": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    },
    "exclude": ["**/*.test.ts", "**/migrations/**", "**/seeds/**"]
  }
}
```

**Métricas de qualidade de testes:**
- **Coverage de branches**: mais importante que line coverage — garante que if/else estão testados
- **Mutation testing** (Stryker): verifica se os testes detectam bugs artificiais
- **Test flakiness**: testes que passam às vezes devem ser corrigidos imediatamente
- **Velocidade da suite**: suite unitária deve rodar em < 30s; de integração em < 5 min

---

## 9. Debugging {#debugging}

### Playbook: Investigar, reproduzir e corrigir defeitos com segurança

**Quando usar:** Sempre que houver um comportamento inesperado em desenvolvimento ou produção.

**Passos do processo de debugging:**
1. **Reproduzir** o problema de forma consistente (se não reproduz, não conserta)
2. **Isolar** — reduzir ao menor caso que reproduz o problema
3. **Hipótese** — formular o que pode estar causando
4. **Verificar** — testar a hipótese (sem mudar muita coisa de vez)
5. **Corrigir** — aplicar a mudança mínima necessária
6. **Prevenir** — adicionar teste de regressão para não voltar

**Ferramentas por linguagem:**
```bash
# Node.js: debug com inspetor
node --inspect src/index.js
# Abre chrome://inspect para debugger visual

# Node.js: logs de performance
node --prof src/index.js
node --prof-process isolate-*.log > profile.txt

# Python: debugger interativo
python -m pdb src/app.py
# No código: import pdb; pdb.set_trace()
# Python 3.7+: breakpoint()

# Java: remote debugging
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 -jar app.jar

# Go: delve debugger
dlv debug ./cmd/server
dlv attach <pid>
```

**Técnicas de diagnóstico:**
```typescript
// Binary search em código complexo — adicione log no meio para dividir
// "O problema está antes ou depois desta linha?"
logger.debug({ checkpoint: 'A', state }, 'Chegou aqui');
// ... código ...
logger.debug({ checkpoint: 'B', result }, 'Chegou aqui também');

// Adicionar assertion para pegar invariante violado cedo
function processOrder(order: Order) {
    console.assert(order.totalCents > 0, `Order ${order.id} has invalid total: ${order.totalCents}`);
    console.assert(order.items.length > 0, `Order ${order.id} has no items`);
    // ...
}

// Reproduzir com dados reais (sanitizados)
// Copie o payload do log de produção e escreva um teste
test('reproduzir bug #1234: pedido com desconto acima do total', async () => {
    const payload = {
        items: [{ productId: 'prod-1', quantity: 1, priceCents: 100 }],
        discountCents: 200, // desconto maior que o total — causava NaN
    };
    const result = await orderService.create(payload);
    expect(result.totalCents).toBe(0); // não deve ser negativo nem NaN
});
```

**Problemas comuns e diagnóstico:**
| Sintoma | Primeiros passos |
|---|---|
| 500 intermitente | Verificar logs de erro + stack trace, checar race conditions |
| Query lenta em produção | `EXPLAIN ANALYZE`, verificar se índice está sendo usado, checar volume de dados |
| Memory leak | Heap snapshot antes/depois, procurar por closures e referências retidas |
| CPU alta | Profiler (clinic.js, py-spy, async-profiler), procurar loops infinitos ou regex catastrófico |
| Timeout em serviço externo | Verificar se timeout está configurado, se circuit breaker abriu, logs do serviço externo |
| Dado inconsistente no banco | Verificar transações, isolation level, race conditions no código |
