# Registro de Auditoria: [Nome do Produto/Projeto]

**Data desta auditoria:**
**Documentos revisados:** [liste os arquivos/IDs de documento cobertos por esta passada — pode incluir documentos das 3 skills: produto, arquitetura e engenharia]
**Revisor:**

> Uma auditoria é uma passada deliberada procurando contradição, requisito órfão, ou decisão desatualizada entre os documentos já gerados — não é o mesmo que revisão de qualidade de um documento isolado. Rode isso periodicamente, especialmente antes de um handoff importante (antes de acionar `arquiteto-software-senior`, antes de acionar `backend-engineer`, antes de uma decisão de arquitetura ficar definitiva) ou sempre que o usuário pedir explicitamente para "revisar/auditar" o que já foi gerado.

## O que procurar numa auditoria

- Requisitos (`REQ-XXX`) que mudaram mas cujas stories/fluxos/ADRs/tasks relacionados não foram atualizados
- Duas seções de documentos diferentes descrevendo a mesma decisão de forma contraditória (ex: PRD diz uma coisa sobre autenticação, a arquitetura decidiu outra, o backend implementou uma terceira)
- Decisão tomada em conversa mas nunca registrada em nenhum documento
- `ADR-XXX` sem nenhum `TASK-XXX` correspondente muito tempo depois do handoff de engenharia (sinal de que a implementação ficou para trás ou foi feita sem registro)
- Estimativas/premissas antigas (velocidade, prazo, custo) que já foram invalidadas por dados reais e não foram recalibradas
- Itens no Índice Mestre de Rastreabilidade com status desatualizado

## Itens encontrados

| # | Item | Descrição | Documentos afetados | Status |
|---|---|---|---|---|
| 1 | | | | 🆕 Novo / ✅ Resolvido / ⚠️ Pendente |

**Convenção de marcação:**
- 🆕 = encontrado nesta auditoria, ainda não corrigido
- ✅ = corrigido como parte desta auditoria — descreva a correção inline no próprio documento afetado, referenciando o número deste item (ex: "correção item 6")
- ⚠️ = identificado mas decisão ainda pendente (normalmente porque depende de validação externa — jurídica, de negócio, ou de um stakeholder específico)

## Como aplicar a correção nos documentos afetados

Ao corrigir um documento a partir de um item desta auditoria, adicione uma nota inline no ponto exato da mudança (não apenas nesta tabela):

```
> ✅ Correção (auditoria [data] — item N): [o que mudou e por quê]
```

## Itens que geraram um documento novo ou um ADR/TASK

| Item | Documento/ADR/TASK gerado |
|---|---|
| | |

## Rastreabilidade

Atualize o `indice-mestre-rastreabilidade-template.md` com qualquer ID novo (REQ/US/FLOW/NAV/OKR/ADR/DOC/TASK/IMPL) que esta auditoria tenha gerado, e adicione uma linha ao histórico de mudanças do índice referenciando esta auditoria.
