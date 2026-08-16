# Post-mortem: [Título curto do incidente]

**Data do incidente:**
**Autor(es) do post-mortem:**
**Severidade:** SEV1 | SEV2 | SEV3
**Duração total:** [tempo entre detecção e resolução]
**Status:** Rascunho | Revisado | Ações concluídas

> Este documento é **blameless**: o objetivo é entender sistemas e processos que permitiram a falha, não atribuir culpa a uma pessoa. Qualquer pessoa razoável, com a informação disponível no momento, teria tomado decisões similares.

## Resumo executivo

[2-3 frases: o que aconteceu, impacto e causa raiz, para quem só vai ler esta seção.]

## Impacto

- **Usuários/clientes afetados:**
- **Duração da degradação/indisponibilidade:**
- **Impacto de negócio (se mensurável):**
- **SLA/SLO violado?**

## Linha do tempo

Todos os horários em UTC (ou fuso combinado pela equipe).

| Horário | Evento |
|---|---|
| | Primeiro sinal (alerta, relato de usuário, etc.) |
| | Incidente declarado / on-call acionado |
| | Causa raiz identificada |
| | Mitigação aplicada |
| | Serviço totalmente restaurado |

## Causa raiz

[O que de fato causou o incidente — não apenas o gatilho imediato, mas as condições estruturais que permitiram que esse gatilho causasse esse impacto. Use "5 Porquês" se ajudar a ir além do sintoma superficial.]

## O que funcionou bem

[Detecção rápida? Runbook existente ajudou? Comunicação com stakeholders foi clara? Reconhecer o que funcionou é tão importante quanto identificar falhas.]

## O que não funcionou / poderia ter sido melhor

[Alertas ausentes ou tardios? Runbook desatualizado? Dependência sem circuit breaker (ver playbook 07)? Falta de bulkhead permitiu propagação?]

## Itens de ação

| Ação | Responsável | Prazo | Prioridade |
|---|---|---|---|
| | | | |

Cada ação deveria mapear para uma melhoria estrutural real (fitness function nova, alerta novo, padrão de resiliência aplicado — ver playbook 07 e 09), não apenas "ter mais cuidado da próxima vez".

## Este incidente deveria gerar um ADR?

[Se a mitigação envolve uma mudança arquitetural relevante — ex: adotar circuit breaker em uma dependência, mudar estratégia de multi-região — registre como ADR em vez de deixar a decisão implícita só neste post-mortem.]
