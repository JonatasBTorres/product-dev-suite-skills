# Provisionamento de Serviços Externos: [Nome do Projeto]

**Tier:** [ver "Calibrando pelo estágio" no SKILL.md]
**Stack de origem:** ver `stack-tecnologica-template.md`

> Trate provisionamento como parte do planejamento de sprint, não como uma surpresa de última hora — serviços com aprovação manual (gateway de pagamento, domínio de e-mail) têm lead time real de dias/semanas e bloqueiam sprints inteiros se só forem iniciados quando o time já precisa deles. Ver playbook 09 (FinOps) para o raciocínio de custo por trás de cada escolha.

## Resumo executivo de custos

| Serviço | Plano | Custo mensal estimado | Escala em que o custo muda |
|---|---|---|---|
| | | | |
| **Total estimado** | | | |

## Checklist de provisionamento

| Serviço | Tarefa | Lead time estimado | Responsável |
|---|---|---|---|
| | | | |

**Regra prática:** ordene esta tabela colocando primeiro os serviços com maior lead time de aprovação (gateways de pagamento, verificação de domínio/KYC) — eles devem ser iniciados antes do Sprint 0, não durante.

## Ordem de criação sugerida

[Liste a ordem de provisionamento considerando dependências entre serviços — ex: domínio precisa existir antes de configurar DNS de e-mail; conta de infraestrutura precisa existir antes de conectar CI/CD.]

1.
2.
3.

## Perguntas resolvidas e pendentes relevantes ao provisionamento

| # | Questão | Status | Decisão/Próximo passo |
|---|---|---|---|
| | | Resolvida / Pendente | |

## Rastreabilidade

**REQ/ADR relacionados:** REQ-XXX, ADR-XXX

> Lembre-se de registrar este documento no `indice-mestre-rastreabilidade.md` se tratado como `DOC-XXX`.
