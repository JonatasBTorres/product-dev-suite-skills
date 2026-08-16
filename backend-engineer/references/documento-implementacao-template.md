# Documento de Implementação: [Domínio — ex: Performance, Segurança, Navigation Map Técnico] (IMPL-XXX)

> Diferente de um documento de arquitetura (`DOC-XXX`, que descreve a **decisão**), este documento descreve a **implementação real**: o que foi de fato construído, com números medidos, checklists aplicados e estado atual do sistema em produção. Use quando o usuário pedir um documento consolidado e separado sobre um domínio técnico inteiro — não uma decisão pontual.

**Documento de arquitetura de origem:** DOC-XXX / ADR-XXX
**Tier do produto:** [ver seção de Tiers]
**Status:** Rascunho / Em revisão / Aprovado
**Data:**

---

## Escopo deste documento

[O que este documento cobre e o que não cobre — ex: "cobre a implementação de performance do serviço de checkout, não do sistema inteiro"]

---

## Exemplo de estrutura — Performance

### Métricas medidas vs. SLO definido

| Métrica | SLO (definido no `DOC-XXX` de arquitetura) | Medido em produção | Status |
|---|---|---|---|
| Latência P50 | | | ✅/⚠️/🔴 |
| Latência P95 | | | ✅/⚠️/🔴 |
| Latência P99 | | | ✅/⚠️/🔴 |
| Throughput | | | ✅/⚠️/🔴 |

### Otimizações implementadas

| Otimização | Onde | Ganho medido |
|---|---|---|
| | | |

### Testes de carga realizados

[Referenciar `chaos-finops-teamtopologies.md` — ferramenta usada (k6/Locust), cenário, resultado]

---

## Exemplo de estrutura — Segurança Implementada

### Checklist de segurança aplicado

| Item do `DOC-XXX` de Arquitetura de Segurança | Implementado? | Como |
|---|---|---|
| Autenticação (ex: OAuth2/OIDC) | ✅/❌ | |
| Criptografia em trânsito/repouso | ✅/❌ | |
| mTLS entre serviços | ✅/❌ | |
| SBOM e assinatura de imagem | ✅/❌ | |
| Rate limiting | ✅/❌ | |

### Vulnerabilidades conhecidas e mitigação

| Vulnerabilidade | Severidade | Status | Mitigação |
|---|---|---|---|
| | | | |

### Última auditoria/pentest

[Data, escopo, resultado resumido, link para relatório completo se houver]

---

## Exemplo de estrutura — Navigation Map Técnico (rotas de API/BFF)

> Complementar ao Navigation Map de produto (`NAV-XXX`, mantido por `product-manager-tech`) — aquele descreve telas do ponto de vista do usuário; este descreve as rotas técnicas que as servem.

| Rota técnica | Método | Serviço | NAV-XXX de produto correspondente | Autenticação |
|---|---|---|---|---|
| | | | | |

---

## Riscos e dívida técnica identificados

| Item | Impacto | Prioridade | Plano |
|---|---|---|---|
| | | | |

---

## Rastreabilidade

**DOC/ADR de arquitetura implementado:** DOC-XXX / ADR-XXX
**TASK-XXX relacionadas:** [tasks do backlog técnico que geraram esta implementação]

> Lembrete: adicione este `IMPL-XXX` ao `indice-mestre-rastreabilidade-template.md` (mantido por `product-manager-tech`), referenciando o `DOC-XXX`/`ADR-XXX` de origem.

## Histórico de Revisões

| Versão | Data | Autor | O que mudou |
|---|---|---|---|
| v1.0 | | | Documento inicial |
