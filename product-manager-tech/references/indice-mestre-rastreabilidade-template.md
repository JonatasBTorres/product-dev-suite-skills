# Índice Mestre de Rastreabilidade — [Nome do Produto/Projeto]

> Este documento é a fonte única de verdade sobre como PRD, backlog de produto, navigation map, fluxos críticos, arquitetura e backlog técnico se conectam. Atualize-o toda vez que um ID novo for criado em qualquer um dos documentos — nunca deixe um ID "órfão" sem entrada aqui. Cobre a cadeia completa `product-manager-tech` → `arquiteto-software-senior` → `backend-engineer`.

**Última atualização:**
**Tier do produto:** [ver seção de Tiers no SKILL.md de product-manager-tech / arquiteto-software-senior]

---

## Requisitos (REQ) — nascem em `product-manager-tech`

| ID | Descrição curta | Documento de origem | Status | Stories relacionadas | Fluxos relacionados | ADRs relacionados |
|---|---|---|---|---|---|---|
| REQ-001 | | PRD v1 | Ativo / Removido / Substituído por REQ-XXX | | | |

## User Stories (US) — nascem em `product-manager-tech`

| ID | Descrição curta | Épico | REQ de origem | Sprint | Status | TASK relacionados |
|---|---|---|---|---|---|---|
| US-001 | | | REQ-XXX | | A fazer / Em progresso / Feito | |

## Fluxos Críticos (FLOW) — nascem em `product-manager-tech`

| ID | Nome do fluxo | REQ de origem | Telas envolvidas (NAV) | Implicação de compliance/segurança | ADR relacionado |
|---|---|---|---|---|---|
| FLOW-PAYMENT-001 | | REQ-XXX | | | |

## Navigation Map (NAV) — nascem em `product-manager-tech`

| ID | Nome da tela | REQ de origem | Fluxo crítico relacionado (se houver) |
|---|---|---|---|
| NAV-001 | | REQ-XXX | |

## OKRs — nascem em `product-manager-tech`

| ID | Objective | Key Results | REQ/métrica de PRD relacionada |
|---|---|---|---|
| OKR-001 | | | |

## Decisões de Arquitetura (ADR) — nascem em `arquiteto-software-senior`

| ID | Decisão (resumo) | REQ/FLOW que motivou | Status | TASK relacionados |
|---|---|---|---|---|
| ADR-001 | | REQ-XXX / FLOW-XXX | Proposto / Aceito / Substituído | |

## Documentos Consolidados de Arquitetura (DOC) — nascem em `arquiteto-software-senior`

Documentos que cobrem um domínio inteiro (ex: Arquitetura de Segurança, Arquitetura de Performance) — diferentes de um ADR pontual porque agregam múltiplas decisões relacionadas em um único documento coerente.

| ID | Nome do documento | REQ/FLOW de origem | ADRs que agrega | Status | IMPL relacionados |
|---|---|---|---|---|---|
| DOC-001 | Arquitetura de Segurança | REQ-XXX | ADR-XXX, ADR-YYY | Rascunho / Em revisão / Aprovado | |

## Backlog Técnico (TASK) — nascem em `backend-engineer`

Itens de implementação concreta: a tradução de uma `US-XXX`/`ADR-XXX` em trabalho de engenharia executável em sprint.

| ID | Descrição curta | US de origem | ADR de origem | Sprint técnico | Status |
|---|---|---|---|---|---|
| TASK-001 | | US-XXX | ADR-XXX | | A fazer / Em progresso / Feito |

## Documentos Consolidados de Implementação (IMPL) — nascem em `backend-engineer`

Documentos de implementação real (não de decisão) — ex: plano de performance com números medidos, checklist de segurança implementada, mapa de rotas/navegação técnica da API.

| ID | Nome do documento | DOC/ADR de origem | Status |
|---|---|---|---|
| IMPL-001 | | DOC-XXX / ADR-XXX | Rascunho / Em revisão / Aprovado |

---

## Histórico de mudanças relevantes

Registre aqui sempre que um ID existente mudar de forma que afete outros documentos (ex: um REQ foi alterado depois que uma decisão de arquitetura ou uma implementação já haviam sido feitas com base nele).

| Data | O que mudou | IDs afetados | Ação necessária |
|---|---|---|---|
| | | | |
