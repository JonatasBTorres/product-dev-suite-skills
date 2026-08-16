# Definição de SLI/SLO: [Nome do serviço/fluxo crítico]

**Serviço/fluxo:**
**Dono (time responsável):**
**Data de definição:**
**Revisão prevista:** [SLOs deveriam ser revisitados periodicamente, não definidos uma vez e esquecidos]

## Por que este fluxo tem um SLO

[Justifique por que este fluxo específico (não outro) merece um SLO formal — geralmente porque é um fluxo crítico de negócio (ex: login, checkout) que o usuário sente diretamente. Evite definir SLO para todo endpoint interno — poucos SLOs bem escolhidos valem mais que muitos ignorados.]

## SLIs (Service Level Indicators)

| SLI | Definição precisa | Fonte de dado |
|---|---|---|
| Disponibilidade | Ex: % de requisições respondidas sem erro 5xx | |
| Latência | Ex: % de requisições respondidas em menos de Xms (especifique o percentil: p95? p99?) | |
| Corretude (se aplicável) | Ex: % de respostas com dado correto/atualizado | |

## SLO (Service Level Objective)

- **Meta:** [ex: 99.9% de disponibilidade, medido em janela móvel de 28 dias]
- **Janela de medição:** [ex: 28 dias rolantes]
- **Como é medido:** [dashboard/query específica — linkar aqui]

## Error Budget

- **Orçamento de erro na janela:** [complemento do SLO — ex: 0.1% = ~43 minutos em 28 dias]
- **O que acontece quando o orçamento se esgota:** [ex: releases de feature nova pausadas até o orçamento se recompor; foco do time redirecionado para confiabilidade — declare isso explicitamente e obtenha acordo do time/produto antes de precisar, não durante a crise]
- **Quem é notificado quando o orçamento está em risco (ex: 50% consumido antes do fim da janela):**

## Alertas associados

| Condição de alerta | Page ou ticket? | Runbook |
|---|---|---|
| | | [link] |

## Histórico de revisão

| Data | Mudança | Motivo |
|---|---|---|
| | | |
