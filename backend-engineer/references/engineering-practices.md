# Práticas de Engenharia — Git, Code Review, Estimativas, Legado e Mentalidade

## Sumário
1. [Versionamento com Git](#git)
2. [Code review](#code-review)
3. [Padrões de equipe](#team-standards)
4. [Documentação técnica](#documentation)
5. [Comunicação técnica e trade-offs](#communication)
6. [Estimativa técnica](#estimation)
7. [Leitura de código legado](#legacy)
8. [Refatoração arquitetural gradual](#arch-refactoring)
9. [Evolução de sistemas em produção](#prod-evolution)
10. [Pensamento orientado a trade-offs](#tradeoffs)
11. [Noção de custo de infraestrutura](#infra-cost)
12. [Mentalidade de produto](#product-mindset)
13. [Colaboração com outras áreas](#collaboration)
14. [Responsabilidade em produção](#ownership)
15. [Aprendizado contínuo](#continuous-learning)

---

## 1. Versionamento com Git {#git}

### Playbook: Git flow profissional

**Convenção de commits (Conventional Commits):**
```bash
# Formato: <tipo>(<escopo>): <descrição>
feat(orders): adicionar endpoint de cancelamento de pedido
fix(auth): corrigir expiração de refresh token
refactor(payments): extrair lógica de validação para service
test(orders): adicionar testes para saga de criação de pedido
docs(api): atualizar OpenAPI com endpoints de webhook
chore(deps): atualizar dependências de segurança
perf(queries): adicionar índice em orders.user_id
ci: configurar pipeline de deploy para staging

# Breaking change
feat(users)!: remover campo full_name deprecated

BREAKING CHANGE: O campo full_name foi removido da API v2.
Clientes devem usar firstName + lastName.
```

**Estratégias de branch:**
```bash
# Feature branch simples (recomendado para maioria dos times)
git checkout -b feat/order-cancellation
git commit -m "feat(orders): implementar endpoint de cancelamento"
git push origin feat/order-cancellation
# → PR → Code Review → Merge to main

# Rebase antes de abrir PR (histórico limpo)
git fetch origin
git rebase origin/main
git push --force-with-lease origin feat/order-cancellation

# Squash commits antes de merge (opcional — histórico mais limpo)
git rebase -i origin/main   # squash commits de WIP
```

**Comandos úteis:**
```bash
# Ver quem alterou cada linha de um arquivo
git blame -L 45,65 src/orders/service.ts

# Encontrar commit que introduziu um bug (binary search)
git bisect start
git bisect bad HEAD
git bisect good v1.2.0
# Git vai checkoutar commits intermediários para você testar

# Desfazer último commit sem perder mudanças
git reset --soft HEAD~1

# Stash com nome descritivo
git stash push -m "WIP: payment refund logic"
git stash list
git stash pop stash@{0}

# Ver diferença entre branches
git diff main..feat/order-cancellation

# Log visual de branches
git log --oneline --graph --all
```

---

## 2. Code review {#code-review}

### Playbook: Revisar código com foco em qualidade e impacto

**Como autor — preparar um PR revisável:**
1. PRs pequenos (< 400 linhas): mais fáceis de revisar, menos erros passam
2. Escreva uma descrição clara: O QUÊ, POR QUÊ, COMO testar
3. Auto-review antes de solicitar: releia seu próprio código
4. Marque PRs de draft quando não estiver pronto
5. Responda todos os comentários — "resolved" sem resposta é anti-social

**Template de PR:**
```markdown
## O que este PR faz?
Adiciona endpoint de cancelamento de pedido pelo cliente.

## Por que?
Requisito do produto: usuários precisam poder cancelar pedidos
nos primeiros 30 minutos após a criação.

## Como testar?
1. Criar um pedido: `POST /api/v1/orders`
2. Cancelar dentro de 30min: `POST /api/v1/orders/:id/cancel`
3. Verificar que status ficou `cancelled` e estoque foi devolvido
4. Testar que cancelamento após 30min retorna 422

## Checklist
- [x] Testes escritos
- [x] OpenAPI atualizado
- [x] Migration com rollback
- [ ] Runbook atualizado (não necessário nesta feature)

## Dependências
Precisa que #123 (devolver estoque) esteja mergeado primeiro.
```

**Como revisor — o que avaliar:**

```
PRIORIDADE 1 — Bloqueantes (precisa corrigir antes de mergear):
- Bugs de lógica ou segurança
- SQL injection, XSS, exposição de dados sensíveis
- Race conditions ou deadlocks
- Breaking changes sem versionamento

PRIORIDADE 2 — Importantes (comentar, mas não necessariamente bloquear):
- Falta de testes para caminhos críticos
- Performance óbvia (N+1 query, lista sem paginação)
- Violação clara de Clean Code / SOLID

PRIORIDADE 3 — Sugestões (prefixar com "Sugestão:" ou "Nitpick:"):
- Nomes melhores
- Oportunidade de refatoração
- Alternativas arquiteturais
```

**Comentários de review construtivos:**
```
❌ "Isso está errado"
✅ "Isso pode causar race condition quando duas requisições simultâneas
    chegarem com o mesmo productId. Sugiro usar SELECT FOR UPDATE
    ou operação atômica: UPDATE ... WHERE stock >= $1 RETURNING stock"

❌ "Por que você fez assim?"
✅ "Noto que o service chama o repository diretamente no controller.
    Isso viola a separação de responsabilidades. O controller deveria
    chamar o service, que por sua vez chama o repository."

❌ "Isso é lento"
✅ "Esta query vai fazer full table scan em orders (50M+ linhas).
    Adicionar índice em (user_id, created_at) deve reduzir
    de ~2s para < 10ms. Quer que eu ajude com o migration?"
```

---

## 3. Padrões de equipe {#team-standards}

### Playbook: Estabelecer e seguir convenções técnicas

**Linting e formatação obrigatórios (não negociável):**
```json
// .eslintrc.json
{
  "extends": ["eslint:recommended", "@typescript-eslint/recommended"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

```yaml
# .github/workflows/ci.yml — lint obrigatório no CI
- name: Lint
  run: npm run lint

- name: Type Check
  run: npm run typecheck

- name: Tests
  run: npm test -- --coverage --coverageThreshold='{"global":{"lines":80}}'
```

**Architectural Decision Records (ADR):**
```markdown
# docs/adr/001-use-postgresql-over-mongodb.md

# ADR-001: Usar PostgreSQL ao invés de MongoDB

**Status:** Aceito
**Data:** 01/03/2025

**Contexto:**
Precisamos escolher o banco de dados principal para o sistema de pedidos.
Os dados têm relacionamentos claros (usuário → pedidos → itens → produtos).

**Decisão:**
Usaremos PostgreSQL.

**Consequências:**
✅ ACID compliance nativo para transações financeiras
✅ JOINs nativos para consultas relacionais
✅ Suporte a JSONB para dados flexíveis quando necessário
⚠️ Menos flexível para mudanças de schema frequentes
⚠️ Escala horizontal mais complexa que MongoDB

**Alternativas consideradas:**
- MongoDB: descartado por falta de transações ACID na época da avaliação
- MySQL: descartado por menor suporte a features avançadas (materialized views, CTEs)
```

---

## 4. Documentação técnica {#documentation}

### Playbook: Documentar código e arquitetura efetivamente

**O que documentar e o que não documentar:**
```typescript
// ❌ Comentário óbvio (não documenta)
// Incrementa o contador
counter++;

// ❌ Comentário desatualizado (pior que nada)
// Retorna o usuário pelo email
async function getUserById(id: string) { ... }

// ✅ Documenta o PORQUÊ (não-óbvio)
// Usamos setTimeout de 100ms aqui porque o Stripe webhook pode chegar
// antes do banco de dados ter processado a transação (race condition observada
// em produção — ver incident #2024-03-15)
setTimeout(() => syncWithStripe(orderId), 100);

// ✅ JSDoc para funções públicas e não-óbvias
/**
 * Calcula o valor de frete baseado no CEP de destino e peso.
 * Retorna 0 para pedidos elegíveis ao frete grátis (> R$199).
 *
 * @param destinationZip - CEP de 8 dígitos sem hífen
 * @param weightGrams - Peso total do pedido em gramas
 * @param orderValueCents - Valor total do pedido em centavos
 * @returns Valor do frete em centavos, ou 0 se frete grátis
 * @throws {InvalidZipError} Se o CEP não for encontrado nos Correios
 */
async function calculateShipping(
    destinationZip: string,
    weightGrams: number,
    orderValueCents: number
): Promise<number> { ... }
```

**README de serviço (template):**
```markdown
# Orders Service

Responsável por criação, gestão e ciclo de vida de pedidos.

## Setup local
\`\`\`bash
cp .env.example .env
docker-compose up -d postgres redis
npm install
npm run db:migrate
npm run dev
\`\`\`

## Dependências externas
- PostgreSQL 15 (banco principal)
- Redis (cache e filas)
- Payment Service (gRPC, porta 50051)
- Inventory Service (REST, INVENTORY_SERVICE_URL)

## Endpoints principais
Ver [OpenAPI spec](./docs/openapi.yaml)

## Rodando testes
\`\`\`bash
npm test           # unit + integration
npm run test:e2e   # end-to-end (requer docker-compose up)
\`\`\`

## Deploy
CI/CD automático via GitHub Actions → staging → manual promotion → production
Ver [deployment guide](./docs/deployment.md)

## On-call
Runbooks: https://wiki.company.com/runbooks/orders-service
Alertas: Grafana → Orders Service Dashboard
```

---

## 5. Comunicação técnica e trade-offs {#communication}

### Playbook: Explicar soluções e riscos para diferentes audiências

**Para engenheiros (técnico):**
```
"Estamos com N+1 query no endpoint GET /orders — para cada pedido,
fazemos 1 query para buscar os items. Com 100 pedidos, são 101 queries.
Proposta: eager load com JOIN ou DataLoader. Reduz de ~2s para ~50ms."
```

**Para produto/negócio (impacto):**
```
"A página de histórico de pedidos está demorando 3 segundos para carregar
quando o usuário tem muitos pedidos. Tenho uma correção que reduz para
menos de 1 segundo. Leva 1 dia de implementação + testes."
```

**Para C-level (risco e custo):**
```
"O banco de dados está chegando ao limite de capacidade. Se não escalarmos,
teremos degradação em 60-90 dias com o crescimento atual. Temos 3 opções:
(1) Upgrade do servidor: R$3k/mês extra, 1 semana, baixo risco
(2) Sharding: R$1k/mês extra, 3 meses, risco médio
(3) Cache agressivo: sem custo extra, 2 semanas, resolve ~60% do problema"
```

---

## 6. Estimativa técnica {#estimation}

### Playbook: Estimar esforço com precisão

**Framework de estimativa (T-shirt sizes com ranges):**
```
XS (< 4h): Bug fix, ajuste de texto, adicionar campo a endpoint existente
S (1-2 dias): CRUD simples, novo endpoint com lógica básica, query otimizada
M (3-5 dias): Feature completa com testes, integração com serviço externo
L (1-2 semanas): Nova entidade/domínio, refatoração significativa, nova integração complexa
XL (> 2 semanas): Nova arquitetura, migração de banco em produção, reescrita de módulo
```

**Checklist de estimativa:**
```
Antes de dar um número, pense em:
□ Entendimento completo do requisito? (se não, fator 2x de incerteza)
□ Há dependências de outros times/serviços?
□ Há dívida técnica que precisa ser paga primeiro?
□ Há casos edge/validações não óbvias?
□ Quanto tempo para testes (unit + integração + QA)?
□ Há risco de mudança de requirements?
□ Inclui documentação e deploy?

Regra: pegue sua estimativa instintiva e multiplique por 1.5 (ou 2 se incerto)
```

**Comunicar estimativas com incerteza:**
```
❌ "Leva 3 dias"
✅ "Minha estimativa é 3-5 dias se os requisitos não mudarem.
    Os principais riscos são: (1) a integração com a API do banco pode ser
    mais complexa que o esperado (+2 dias) e (2) precisamos alinhar com
    o time de segurança sobre o fluxo de autorização (+1 dia)."
```

---

## 7. Leitura de código legado {#legacy}

### Playbook: Entender e evoluir sistemas existentes com segurança

**Passos para entrar em codebase desconhecida:**
1. Leia o README e documentação existente (mesmo desatualizada, dá contexto)
2. Rode o sistema localmente e entenda o fluxo feliz end-to-end
3. Identifique os módulos/serviços centrais (onde a maioria das mudanças acontece)
4. Leia os testes existentes — documentam comportamento esperado
5. Use `git log` para entender histórico de mudanças

```bash
# Ferramentas para explorar código legado

# Ver arquivos mais modificados (hot spots de complexidade)
git log --format=format: --name-only | sort | uniq -c | sort -rg | head -20

# Ver quando uma função foi introduzida
git log -S "function calculateShipping" --source --all

# Entender contexto de um bloco de código
git log -p -L :calculateShipping:src/orders/service.ts

# Encontrar onde uma variável/função é usada
grep -rn "calculateShipping" --include="*.ts" src/

# Gerar mapa de dependências (TypeScript)
npx madge --circular src/

# Medir complexidade ciclomática
npx complexity-report src/orders/service.ts
```

**Adicionar testes ao código legado (Characterization Tests):**
```typescript
// Antes de refatorar, documente o comportamento atual
// (mesmo que pareça errado — garante que refatoração não quebra)
describe('LegacyOrderService (characterization tests)', () => {
    it('comportamento atual ao criar pedido sem estoque', async () => {
        // Gravar o comportamento atual, não o ideal
        const result = await legacyService.createOrder({ productId: 'out-of-stock', quantity: 1 });
        // O código atual retorna null em vez de throw — documentamos isso
        expect(result).toBeNull();
    });
});
```

---

## 8. Refatoração arquitetural gradual {#arch-refactoring}

### Playbook: Melhorar sistemas sem reescrita total

**Padrão Strangler Fig (estrangulamento gradual):**
```
Monolito Legado
     │
     ▼
[API Gateway / Proxy]
     │
     ├──── /api/v1/orders ────► Novo Orders Service (microsserviço)
     ├──── /api/v1/users  ────► Novo Users Service (microsserviço)
     └──── /api/v1/*      ────► Monolito Legado (ainda serve o resto)
```

```typescript
// Branch-by-abstraction: extrai interface antes de mudar implementação
// Passo 1: Criar interface
interface OrderRepository {
    findById(id: string): Promise<Order | null>;
    save(order: Order): Promise<void>;
}

// Passo 2: Criar implementação nova (não remove a antiga ainda)
class PostgresOrderRepository implements OrderRepository { ... }
class LegacyMysqlOrderRepository implements OrderRepository { ... }

// Passo 3: Feature flag para migração gradual
const repo: OrderRepository = featureFlags.isEnabled('new-order-repo')
    ? new PostgresOrderRepository(pgPool)
    : new LegacyMysqlOrderRepository(mysqlPool);

// Passo 4: Monitorar comportamento da nova implementação
// Passo 5: Aumentar % do flag gradualmente
// Passo 6: Remover implementação antiga quando 100% migrado
```

**Regras para refatoração segura:**
```
1. Uma mudança de cada vez — refatoração separada de feature
2. Cobertura de testes antes de refatorar
3. Commits pequenos e frequentes
4. Revisar diferença de comportamento em produção (métricas, logs)
5. Feature flag para rollback rápido se necessário
```

---

## 9. Evolução de sistemas em produção {#prod-evolution}

### Playbook: Mudar banco, API e infraestrutura sem downtime

**Migrations zero-downtime (expand-contract):**
```sql
-- FASE 1: EXPAND — adicionar sem remover (deploy 1)
ALTER TABLE users ADD COLUMN full_name VARCHAR(200);

-- Código escrevendo nos dois campos simultaneamente
UPDATE users u1
SET full_name = first_name || ' ' || last_name
WHERE u1.full_name IS NULL;

-- FASE 2: Migrar dados em background (sem bloquear)
-- Worker processa em batches para não bloquear tabela

-- FASE 3: CONTRACT — remover coluna antiga (deploy 2, dias/semanas depois)
-- Apenas após verificar que nenhum código lê a coluna antiga
ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
```

**Mudanças de API sem quebrar clientes:**
```typescript
// Regra: só adicionar, nunca remover. Depreciar antes de remover.

// ✅ Adicionar campo opcional (non-breaking)
{ id, name, email }  →  { id, name, email, phone? }

// ✅ Manter campo deprecated e adicionar novo
{ name: "João Silva" }  →  { name: "João Silva", firstName: "João", lastName: "Silva" }

// ❌ Remover campo sem versionamento (BREAKING)
{ id, name, email }  →  { id, email }  // name foi removido — quebra clientes!

// ❌ Mudar tipo de campo (BREAKING)
{ active: true }  →  { active: "yes" }  // mudou de boolean para string — quebra!
```

---

## 10. Pensamento orientado a trade-offs {#tradeoffs}

### Playbook: Tomar decisões técnicas bem fundamentadas

**Framework DECS (Decision, Evaluation, Consequences, Signal):**
```markdown
## Decisão: Usar Redis para sessões vs JWT stateless

### Opção A: Redis Sessions
Avaliação: Estado centralizado, invalidação instantânea, logout funciona
✅ Segurança: pode invalidar sessão imediatamente (logout, comprometimento)
✅ Rastreabilidade: sabe quantos usuários ativos existem
⚠️ Operacional: Redis é mais um componente para operar/escalar
⚠️ Performance: lookup no Redis a cada requisição (~1ms extra)

### Opção B: JWT Stateless
Avaliação: Sem estado no servidor, fácil de escalar horizontalmente
✅ Escalabilidade: nenhuma dependência externa para autenticar
✅ Simplicidade: não precisa de Redis só para auth
⚠️ Segurança: não há logout real — token válido até expirar
⚠️ Refresh tokens: precisa de storage para blacklist mesmo assim

### Decisão
JWT com access token (15min) + refresh token no Redis (7 dias)
Melhor dos dois mundos: stateless para autenticação, controle de sessão via refresh
```

**Dimensões de trade-off:**
```
┌──────────────────────────────────────────────────────────────┐
│                    TRADE-OFF DIMENSIONS                       │
│                                                               │
│  Velocidade de entrega  ◄──────────────────► Qualidade        │
│  Simplicidade           ◄──────────────────► Flexibilidade    │
│  Performance            ◄──────────────────► Custo            │
│  Consistência           ◄──────────────────► Disponibilidade  │
│  Segurança              ◄──────────────────► Usabilidade      │
│  Acoplamento baixo      ◄──────────────────► Coesão alta      │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. Noção de custo de infraestrutura {#infra-cost}

### Playbook: Projetar pensando em custo operacional

**Estimativa rápida de custo (AWS referência 2024):**
```
EC2/ECS (app servers):
  t3.small (2vCPU, 2GB): ~$15/mês
  t3.medium (2vCPU, 4GB): ~$30/mês
  c5.xlarge (4vCPU, 8GB): ~$140/mês

RDS PostgreSQL:
  db.t3.medium Multi-AZ: ~$100/mês
  db.r5.large Multi-AZ: ~$400/mês
  Storage: ~$0.12/GB/mês

ElastiCache Redis:
  cache.t3.medium: ~$50/mês
  cache.r5.large: ~$200/mês

S3:
  Storage: $0.023/GB/mês
  Requests GET: $0.0004/1000
  Transfer out: $0.09/GB

Bandwidth:
  Entre regiões AWS: $0.02/GB
  Para internet: $0.09/GB (pode ser dominante em apps de mídia)
```

**Onde o custo explode — anti-patterns:**
```
❌ SELECT * sem paginação em tabela de 10M linhas
   → Lê e transfere GBs desnecessários, estoura memória

❌ Logs verbosos (DEBUG) em produção para todas as requests
   → CloudWatch Logs: $0.50/GB — em alto volume, custa centenas/mês

❌ Thumbnail generation on-the-fly para cada request
   → Processar imagem a cada request = CPU cara; cache/pre-generate

❌ Bucket S3 público com hotlinks
   → Outro site linkando suas imagens: você paga o bandwidth deles

❌ Lambda com 1GB de RAM para task simples
   → Superprovisionar lambdas = custo 4x maior que necessário

✅ CloudFront na frente do S3: reduz custo de S3 e latência
✅ Reserved instances para workloads previsíveis: 40-60% de desconto
✅ Lifecycle policies no S3: mover dados frios para Glacier após 90 dias
```

---

## 12. Mentalidade de produto {#product-mindset}

### Playbook: Conectar decisões técnicas com valor de negócio

**Perguntas que todo engenheiro backend deve se fazer:**
```
Antes de implementar:
□ Qual problema real do usuário/negócio isso resolve?
□ Como vou medir se funcionou? (métrica de sucesso)
□ Existe solução mais simples que resolve 80% do problema?
□ Qual o custo de NÃO fazer?

Ao definir SLOs:
□ Qual latência é aceitável para o usuário nesta operação?
   (checkout: < 2s; relatório mensal: 10s é ok)
□ Qual disponibilidade afeta negativamente o negócio?
   (pagamentos: 99.99%; relatório interno: 99.5% é suficiente)

Ao escolher tecnologia:
□ O time consegue operar e debugar em produção?
□ A complexidade agrega ou apenas impressiona?
□ Em 2 anos, ainda será uma boa escolha?
```

**Métricas que o negócio se importa (e você deve monitorar):**
```typescript
// Business metrics — não só técnicas
const businessMetrics = {
    // Funil de conversão
    ordersCreated: counter({ name: 'orders_created_total' }),
    ordersPaid: counter({ name: 'orders_paid_total' }),
    ordersShipped: counter({ name: 'orders_shipped_total' }),

    // Revenue impact de falhas
    paymentFailures: counter({ name: 'payment_failures_total', labelNames: ['reason'] }),

    // Experiência do usuário
    checkoutDuration: histogram({ name: 'checkout_duration_seconds' }),
    searchLatency: histogram({ name: 'product_search_duration_seconds' }),
};
```

---

## 13. Colaboração com outras áreas {#collaboration}

### Playbook: Trabalhar bem com produto, QA, DevOps, dados e segurança

**Com Product Manager:**
```
- Participe do refinamento de requisitos (você pode ver problemas técnicos cedo)
- Traduza complexidade técnica para impacto de negócio
- Proponha alternativas quando o caminho pedido é tecnicamente perigoso
- Comunique riscos com antecedência, não no dia do deadline
```

**Com QA:**
```
- Entregue funcionalidade com testes unitários e de integração já rodando
- Documente os casos edge e cenários de falha que você conhece
- Crie ambientes de teste estáveis com dados realistas
- Corrija bugs reportados pelo QA com prioridade
```

**Com DevOps/SRE:**
```
- Implemente health checks e readiness probes
- Documente variáveis de ambiente e configurações necessárias
- Escreva runbooks para operações manuais (rollback, re-processar fila)
- Participe de on-call rotations para entender problemas de produção
```

**Com Dados/Analytics:**
```
- Pense em rastreabilidade desde o design (event tracking, audit logs)
- Exponha dados relevantes via eventos ou tabelas de staging
- Evite mudanças de schema que quebrem pipelines de dados sem aviso
```

**Com Segurança:**
```
- Faça threat modeling em features sensíveis (auth, pagamentos, dados pessoais)
- Não suba mudanças de segurança crítica sem revisão do time de segurança
- Corrija vulnerabilidades reportadas com o SLA combinado
```

---

## 14. Responsabilidade em produção {#ownership}

### Playbook: Ownership sobre o que você constrói

**Mentalidade de ownership:**
```
Você é dono do que constrói. Isso significa:

□ Você monitora o serviço após o deploy
□ Você lê os alertas do seu serviço
□ Você escreve runbooks para quem faz plantão
□ Você participa da investigação de incidentes do seu código
□ Você não considera "funcionou no meu ambiente" como sucesso
□ Você atualiza dependências com vulnerabilidades (não espera alguém mandar)
□ Você limpa dívida técnica que você criou
```

**Checklist pós-deploy:**
```
Após qualquer deploy significativo:
□ Métricas de erro estão normais?
□ Latência não aumentou?
□ Logs não estão mostrando novos erros?
□ Filas não estão acumulando?
□ Consumo de memória/CPU estável?

Se algo estranho:
→ Rollback imediato
→ Investigar depois de estabilizar
```

---

## 15. Aprendizado contínuo {#continuous-learning}

### Playbook: Evoluir como engenheiro backend

**Fontes de referência técnica:**
- Documentação oficial da sua stack principal (ler, não só googlar)
- Martin Fowler's blog (martinfowler.com) — arquitetura e padrões
- High Scalability (highscalability.com) — cases reais de escala
- AWS/GCP/Azure Architecture Center — patterns de nuvem
- OWASP (owasp.org) — segurança
- PostgreSQL Documentation — muito mais rico que tutoriais

**Aprender com produção:**
```
Cada incidente é uma aula:
□ O que eu não sabia que precisava saber?
□ Qual pattern/ferramenta teria evitado o problema?
□ O que mudei na minha forma de desenvolver depois?

Keep a "TIL (Today I Learned)" doc:
2025-03-15: pg_stat_activity mostra queries bloqueadas — útil para debug de locks
2025-03-20: Promise.all falha fast, Promise.allSettled espera todos resolverem
2025-04-01: Circuit breaker deve ter half-open state para recovery gradual
```

**Medir seu crescimento:**
```
A cada 6 meses, avalie honestamente:
□ Consigo depurar problemas de produção sem ajuda?
□ Minhas estimativas estão cada vez mais próximas da realidade?
□ Consigo explicar minhas decisões arquiteturais para outros engenheiros?
□ O código que escrevi 6 meses atrás envergonha ou orgulha?
□ Estou aprendendo novas ferramentas/padrões? Ou só usando o que já sei?
```
