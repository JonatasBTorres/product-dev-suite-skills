# Playbook 05 — Multi-Tenancy & Arquiteturas SaaS

## Escopo

Modelos de isolamento de dados entre clientes (tenants), governança de recursos compartilhados (noisy neighbor, rate limiting por plano). Use este playbook para qualquer pergunta sobre "como estruturo meu SaaS multi-cliente" ou "isolamento de dados entre tenants".

> **Nota de calibração (ver Tiers no `SKILL.md`):** Shared Database + RLS já é a recomendação certa mesmo em Tier 1 — não é uma simplificação "temporária", é a arquitetura correta para a maioria dos SaaS B2B até escala considerável. Rate limiting/quotas por plano formal costuma só compensar a partir de Tier 2, quando existem múltiplos planos comerciais reais.

## Framework de decisão: modelo de isolamento de dados

| Modelo | Isolamento | Custo operacional | Custo de infra | Quando usar |
|---|---|---|---|---|
| **Database-per-tenant** | Máximo (cada tenant tem seu próprio banco físico) | Alto (migrations, backups, monitoramento multiplicados por N tenants) | Alto (overhead de conexões/recursos por banco) | Poucos tenants grandes (dezenas a centenas), com requisitos fortes de compliance/isolamento (ex: contratos enterprise que exigem banco dedicado, dados de saúde/financeiros com exigência regulatória de segregação física) |
| **Schema-per-tenant** | Alto (schemas separados no mesmo banco/instância) | Médio (uma instância para monitorar, mas migrations ainda multiplicadas por schema) | Médio | Meio-termo quando há dezenas a milhares de tenants e se quer isolamento lógico forte sem o custo de instâncias separadas |
| **Shared Database + Row-Level Security (RLS)** | Lógico, imposto pelo banco (não pela aplicação) | Baixo (uma migration, um schema para todos) | Baixo (melhor aproveitamento de recursos) | Milhares a milhões de tenants pequenos/médios — o padrão dominante para SaaS B2B de escala, especialmente com Postgres RLS |

**Regra prática de evolução:** comece com Shared Database + RLS como padrão. Migre tenants específicos para banco dedicado apenas quando um requisito concreto exigir (contrato enterprise, volume de dados que degrada os demais tenants, requisito regulatório específico daquele cliente) — arquiteturas híbridas (a maioria dos tenants em shared DB, alguns grandes isolados) são comuns e válidas em produtos maduros.

### Row-Level Security na prática (Postgres)

```sql
-- Toda tabela multi-tenant carrega tenant_id
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON pedidos
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- A aplicação define o tenant no início de cada transação/conexão
SET app.current_tenant = '123e4567-e89b-12d3-a456-426614174000';
```

**Ponto crítico de segurança:** RLS só protege se **toda** conexão da aplicação de fato define `app.current_tenant` antes de qualquer query, e se a role de banco usada pela aplicação não tem `BYPASSRLS`. Trate "esquecer de setar o tenant" como uma classe de bug tão grave quanto uma injeção de SQL — idealmente, centralize isso em um middleware/interceptor de acesso a dados, nunca deixe cada query manual responsável por lembrar.

## Governança de recursos compartilhados

### Noisy Neighbor

Um tenant com uso anômalo (query pesada, volume de escrita muito acima da média) não deve degradar a experiência dos demais. Mitigações, da mais simples à mais robusta:

1. **Rate limiting e quotas por tenant** (não só por API key genérica) — aplicado na camada de gateway/API, com limites diferentes por plano de assinatura.
2. **Connection pooling por tenant ou por grupo de tenants** — evita que um tenant esgote o pool de conexões compartilhado do banco. Ferramentas como PgBouncer com pools segmentados, ou pools por schema.
3. **Filas/workers dedicados por tier de plano** — separar processamento assíncrono de tenants enterprise (SLA maior) dos tenants do plano gratuito, para que um pico no plano gratuito não atrase o enterprise.
4. **Isolamento físico (banco/instância dedicada)** para o tenant que consistentemente excede o que o modelo compartilhado suporta — geralmente acompanhado de um tier de preço correspondente.

### Rate limiting e quotas dinâmicas por plano

- Modele limites como configuração por plano de assinatura, não hardcoded no código — permite ajustar limites comerciais sem deploy.
- Prefira algoritmos de **token bucket** ou **sliding window** a "fixed window" simples (fixed window permite bursts 2x no limite na fronteira entre janelas).
- Exponha os limites e o uso atual ao cliente via headers de resposta (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) — reduz tickets de suporte e permite que o cliente implemente backoff.

## Considerações de multi-tenancy que cruzam outros playbooks

- **Segurança/compliance** (playbook 08): isolamento de dados multi-tenant é frequentemente um requisito de compliance explícito (SOC2, contratos enterprise) — trate RLS/isolamento como controle auditável, com testes automatizados que provam que um tenant não consegue ler dado de outro.
- **Observabilidade por tenant**: métricas, logs e traces devem carregar `tenant_id` como dimensão desde o início — sem isso, debugar "por que o tenant X está lento" vira arqueologia manual.
- **FinOps** (playbook 09): custo por tenant deveria ser calculável (mesmo que aproximado) para informar pricing e identificar tenants não-lucrativos no modelo shared — especialmente relevante quando o modelo de cobrança não é perfeitamente proporcional ao uso de infraestrutura.

## Antipadrões comuns

- **`tenant_id` opcional ou inconsistente entre tabelas** — algumas tabelas isoladas por tenant, outras não, sem uma regra clara de "toda tabela nova precisa disso por padrão".
- **Confiar isolamento inteiramente na camada de aplicação sem defesa em profundidade no banco** — um bug em uma query manual (esqueceu o `WHERE tenant_id = ?`) vaza dados entre clientes. RLS existe exatamente para ser a segunda camada de defesa.
- **Rate limiting só por IP ou API key, sem awareness de plano/tenant** — um tenant do plano enterprise e um do plano gratuito competindo pelo mesmo limite genérico.
- **Migrar todo mundo para banco dedicado "para simplificar"** sem necessidade real — multiplica custo de infraestrutura e operação (backups, patches, monitoramento) por tenant, quando RLS resolveria a esmagadora maioria dos casos.
- **Nenhum teste automatizado de isolamento entre tenants** — a garantia de isolamento devia ser testada como qualquer outro requisito crítico de segurança, não assumida como "óbvia" porque o código parece certo.
