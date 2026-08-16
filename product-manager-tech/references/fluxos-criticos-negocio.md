# Fluxos Críticos de Negócio (FLOW-XXX)

> Framework para documentar qualquer fluxo de negócio onde o custo de um erro é alto — pagamento, checkout, onboarding com verificação de identidade (KYC), cancelamento/reembolso, ativação de assinatura. Use sempre que o pedido for "documente o fluxo de X", especialmente quando X envolver dinheiro, dados sensíveis, ou uma ação difícil de reverter.

---

## Por que um documento próprio (não só stories no backlog)

Um fluxo crítico atravessa múltiplas telas, estados de sistema, e frequentemente múltiplos serviços técnicos — nenhuma user story individual do backlog captura a visão completa do fluxo de ponta a ponta, incluindo os caminhos de erro. Sem um documento dedicado, o conhecimento do fluxo completo existe só na cabeça de quem implementou, e cada exceção nova é descoberta em produção em vez de antecipada no design.

---

## Template — Documento de Fluxo Crítico

```
# Fluxo Crítico: [Nome do fluxo] (FLOW-XXX)

Requisito(s) de origem (PRD): REQ-XXX
Telas envolvidas (Navigation Map): NAV-XXX, NAV-YYY
Criticidade: [ex: envolve pagamento / dado sensível / ação irreversível]
Documento de arquitetura relacionado (se houver): DOC-XXX / ADR-XXX

## Atores envolvidos
- Usuário:
- Sistemas internos:
- Sistemas externos: [ex: gateway de pagamento, serviço de antifraude, provedor de KYC]

## Pré-condições
[O que precisa ser verdade antes do fluxo começar]

## Caminho feliz
1.
2.
3.

## Caminhos alternativos e de erro
| Cenário | O que acontece | O que o usuário vê |
|---|---|---|

## Regras de negócio
[Condições que determinam comportamento — ex: janelas de tempo, limites, políticas de retry]

## Requisitos de compliance/segurança conhecidos
[Sinalize aqui qualquer obrigação regulatória identificada — ex: PCI-DSS para dado de
cartão, KYC/AML para verificação de identidade, LGPD/GDPR para dado pessoal. A análise
técnica completa é responsabilidade da skill de arquitetura — aqui só é preciso garantir
que o sinal chegue até lá através do handoff.]

## Rastreabilidade
REQ de origem: REQ-XXX
NAV relacionados: NAV-XXX
ADR relacionado (preenchido após handoff de arquitetura): ADR-XXX
TASK relacionado (preenchido após handoff de engenharia): TASK-XXX

> Lembrete: adicione este FLOW-XXX ao índice mestre de rastreabilidade.
```

---

## Fluxo de pagamento — o exemplo mais comum, tratado como caso do framework geral

Um fluxo de pagamento (`FLOW-PAYMENT-XXX`) tipicamente precisa capturar: método(s) de pagamento aceitos, o que acontece em cada tipo de recusa (fundos insuficientes, fraude suspeita, erro do gateway), política de retry (o usuário pode tentar de novo? quantas vezes?), o que o usuário vê em cada estado (processando, aprovado, recusado, pendente), e a política de reembolso/estorno.

**Sinalize explicitamente para o handoff de arquitetura** que este fluxo tem implicação de compliance — processar dado de cartão aciona escopo de PCI-DSS (a skill `arquiteto-software-senior` trata como recomendação central minimizar esse escopo tokenizando o dado o mais cedo possível via gateway). Esta skill de produto não decide a arquitetura técnica de tokenização — só garante que o requisito de negócio ("aceitar pagamento com cartão") chegue com o contexto de compliance já identificado, para a arquitetura não descobrir isso tarde.

---

## Outros fluxos críticos comuns — o mesmo framework se aplica

- **Onboarding com KYC**: pré-condições de documento válido, caminhos de rejeição de verificação, tempo de espera aceitável, o que o usuário pode fazer enquanto pendente.
- **Cancelamento/reembolso de assinatura**: janelas de tempo, política de reembolso proporcional, retenção (fluxo de tentativa de reter o usuário antes de confirmar o cancelamento) e suas implicações éticas/regulatórias (dark patterns a evitar).
- **Convite/colaboração multi-usuário**: o que acontece se o convidado já tem conta, se o convite expira, se há limite de assentos/licenças.

O objetivo não é enumerar todos os fluxos possíveis, mas garantir que **qualquer** fluxo com custo alto de erro receba o mesmo rigor de documentação — atores, pré-condições, caminho feliz, caminhos de erro, regras de negócio, e sinalização explícita de compliance quando aplicável.

---

## Diagrama de fluxo entre atores (quando há split/distribuição entre partes)

```
┌─────────────── [NOME DO FLUXO/MODELO] ───────────────┐
│                                                        │
│  [Ator 1] ──ação──► [Sistema/Intermediário]           │
│                            │                           │
│                            │ Split/distribuição        │
│                  ┌─────────┴──────────┐                │
│                  ▼                    ▼                │
│           [Ator 2]              [Ator 3]                │
│           (X% exemplo)          (Y% exemplo)            │
└────────────────────────────────────────────────────────┘
```

Use quando prosa ou tabela não deixarem claro rápido o suficiente "quem manda o quê pra quem, e quem fica com qual parte" (ex: comissão, taxa, repasse entre marketplace e vendedor).

---

## Antipadrões comuns

- **Documentar só o caminho feliz** de um fluxo de pagamento/cancelamento — os caminhos de erro são onde vive a maior parte da complexidade real (e do risco de negócio).
- **Tratar a implicação de compliance como "problema da engenharia descobrir depois"** — atrasar essa sinalização custa retrabalho caro quando descoberto tarde no handoff de arquitetura.
- **Duplicar a lógica de regra de negócio em vários documentos** em vez de manter uma fonte única (`FLOW-XXX`) referenciada pelas stories do backlog que a implementam.
- **Fluxo de cancelamento desenhado para maximizar retenção a ponto de virar dark pattern** — abre risco regulatório e de reputação, independente de "funcionar" no curto prazo.
