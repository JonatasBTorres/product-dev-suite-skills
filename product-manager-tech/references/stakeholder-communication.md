# Comunicação e Gestão de Stakeholders — Guia do Product Manager

> Boa parte do trabalho de um PM sênior é comunicação, não escrita de spec. Esta referência cobre como mapear stakeholders, definir responsabilidades e manter todos informados sem gerar reunião desnecessária.

---

## 1. Mapa de Stakeholders (Power/Interest Grid)

```
                    ALTO PODER
                        |
   Manter satisfeito    |   Gerenciar de perto
   (informar, não       |   (envolver ativamente,
    sobrecarregar)      |    decisões em conjunto)
                        |
   BAIXO ───────────────┼─────────────── ALTO
   INTERESSE            |               INTERESSE
                        |
   Monitorar            |   Manter informado
   (esforço mínimo,     |   (updates regulares,
    comunicação          |    sem necessidade de
    esporádica)          |    aprovação constante)
                        |
                    BAIXO PODER
```

```
Template de mapeamento:

Stakeholder: [Nome/Cargo]
Quadrante: [Gerenciar de perto / Manter satisfeito / Manter informado / Monitorar]
Interesse principal: [O que essa pessoa quer saber/decidir sobre este produto?]
Frequência de contato: [Ex: semanal / quinzenal / só em marcos]
Canal preferido: [Reunião / Slack / E-mail / Dashboard]
```

---

## 2. RACI Matrix

Use quando várias áreas estão envolvidas e não está claro quem decide o quê.

- **R (Responsible)** — quem executa o trabalho
- **A (Accountable)** — quem responde pelo resultado final (apenas 1 pessoa por linha)
- **C (Consulted)** — quem é ouvido antes da decisão (via de mão dupla)
- **I (Informed)** — quem é avisado depois da decisão (via de mão única)

```
RACI — [Nome da iniciativa/decisão]

Atividade/Decisão          | PM  | Eng Lead | Design | Marketing | Suporte | Legal
---------------------------|-----|----------|--------|-----------|---------|------
Definir escopo do PRD      |  A  |    C     |   C    |     I     |    I    |   I
Aprovar design final       |  C  |    I     |   A    |     I     |    -    |   -
Decidir data de lançamento |  A  |    R     |   C    |     C     |    C    |   -
Aprovar termos legais      |  C  |    -     |   -    |     I     |    -    |   A
Comunicar externamente     |  C  |    -     |   -    |     A     |    C    |   C

Regra: só pode haver UM "A" por linha. Se duas pessoas acham que são
"accountable" pela mesma decisão, isso é a causa raiz de travamento —
resolva isso antes de seguir.
```

---

## 3. Status Report Semanal — Template

```
STATUS REPORT — [Produto/Squad] — Semana de [DD/MM]

🎯 Resumo em uma frase: [O que mais importa saber essa semana]

Progresso:
✅ [Entregue essa semana]
🚧 [Em andamento — % ou estágio]
📋 [Próxima semana]

Riscos e bloqueios:
🔴 [Bloqueio ativo] — Precisa de: [ação/decisão de quem]
🟡 [Risco monitorado] — [O que pode virar bloqueio]

Métricas-chave (se houver mudança relevante):
[Métrica] — [Valor atual] ([tendência: ↑↓→] vs. semana anterior)

Decisões que precisam de input de stakeholders:
- [Pergunta objetiva] — Precisa de resposta até [data]
```

**Regra de ouro:** status report não é para "parecer ocupado" — se não há bloqueio, risco ou decisão pendente, uma linha de "no prazo, sem novidades" é suficiente. Reports infladas ensinam stakeholders a não ler.

---

## 4. Monthly Business Review (MBR) / Executive Update

Formato mais longo, voltado a liderança que não acompanha o dia a dia.

```
MONTHLY BUSINESS REVIEW — [Produto] — [Mês/Ano]

## 1. Resumo executivo (3-5 linhas)
[O que aconteceu, o que importa, o que precisa de atenção — sem precisar ler o resto]

## 2. Métricas-chave vs. meta
| Métrica | Meta do mês | Realizado | Tendência |
|---|---|---|---|
| [North Star] | [Valor] | [Valor] | ↑/↓/→ |
| [Guardrail 1] | [Valor] | [Valor] | ↑/↓/→ |

## 3. Principais entregas do mês
- [Entrega 1] — impacto observado: [dado, se já disponível]
- [Entrega 2]

## 4. Principais aprendizados
- [O que descobrimos via discovery/experimento que muda algo]

## 5. Riscos e decisões que precisam de apoio da liderança
- [Risco/decisão] — Impacto se não resolvido: [...] — Precisa de: [...]

## 6. Foco do próximo mês
- [Prioridade 1]
- [Prioridade 2]
```

---

## 5. Como dizer não a um pedido de stakeholder

Dizer não sem justificativa erode confiança; dizer sim a tudo destrói o roadmap. Estrutura recomendada:

```
1. Reconhecer o valor do pedido: "Entendo por que isso importa para [motivo real do stakeholder]."
2. Mostrar o custo de oportunidade: "Se priorizarmos isso agora, [X] que já estava no roadmap
   atrasa em [tempo]."
3. Oferecer alternativa, quando existir: "Uma versão menor que resolve 80% disso seria [Y],
   com esforço bem menor."
4. Deixar a porta aberta com critério: "Se [condição — ex: 3 clientes grandes pedirem isso
   nas próximas 4 semanas], eu re-priorizo."
```

Evite: "não vai dar" sem explicação, ou concordar na reunião e não entregar depois (pior para a confiança do que um não direto).

---

## 6. Diretrizes de Comunicação Assíncrona (times remotos/distribuídos)

```
- Toda decisão importante fica registrada por escrito (não só combinada em call) —
  quem não estava na reunião deve conseguir entender o "porquê" lendo depois.
- Perguntas que bloqueiam alguém: sinalizar prazo explícito ("preciso de resposta até
  quinta 14h ou vou assumir [default]").
- Reunião síncrona só quando: decisão precisa de debate em tempo real, ou o tema é
  sensível/emocional. Atualização de status não precisa de reunião.
- Toda reunião recorrente tem uma pauta compartilhada com antecedência — sem pauta,
  cancelar.
```

---

## Checklist — Comunicação de stakeholders está saudável quando:
- [ ] Existe um RACI claro para decisões que cruzam mais de uma área
- [ ] Nenhum stakeholder de "alto poder / alto interesse" foi surpreendido por uma decisão
- [ ] Reports refletem risco real, não otimismo de vaidade
- [ ] Pedidos recusados têm razão explícita registrada (evita repetição do mesmo pedido)
