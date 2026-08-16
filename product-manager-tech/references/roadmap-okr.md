# Roadmap e OKRs — Guia para Product Managers

## OKRs (Objectives and Key Results)

### Estrutura

```
OKR-[número]

Objetivo: [Declaração qualitativa e inspiradora do que queremos alcançar]
Período: [Q1 2025 / Anual 2025]
Owner: [PM / Squad responsável]

KR1: [Resultado mensurável 1]
  Baseline: [Valor atual]
  Meta: [Valor alvo]
  Unidade: [%, #, R$, NPS points...]

KR2: [Resultado mensurável 2]
  Baseline: [Valor atual]
  Meta: [Valor alvo]

KR3: [Resultado mensurável 3]
  Baseline: [Valor atual]
  Meta: [Valor alvo]

Requisito/métrica de PRD relacionada: REQ-XXX
Iniciativas que contribuem para este objetivo:
- [Epic/projeto A] → impacta KR1 e KR2
- [Epic/projeto B] → impacta KR3
```

> **Rastreabilidade:** adicione este `OKR-XXX` ao `indice-mestre-rastreabilidade-template.md`, ligando-o ao(s) `REQ-XXX` do PRD correspondente.

### Princípios para bons OKRs

**Objetivo (O):**
- Deve ser qualitativo, motivador e claro
- Evitar objetivos que soem como tarefas ("Lançar feature X")
- Perguntar: "Se alguém falar esse objetivo em voz alta, vai inspirar o time?"

**Key Results (KRs):**
- Devem ser mensuráveis e verificáveis (sem ambiguidade)
- Geralmente de 2 a 5 KRs por objetivo
- Um bom KR começa com verbo: "Aumentar", "Reduzir", "Atingir", "Alcançar"
- Regra: se não tiver número, não é KR
- OKRs bem escritos: 70% de confiança de atingir. Se for 100%, a meta é fácil demais.

**Anti-padrões comuns:**
- ❌ KR como tarefa: "Lançar nova tela de onboarding"
- ✅ KR como resultado: "Aumentar taxa de conclusão do onboarding de 45% para 65%"
- ❌ KR vago: "Melhorar a experiência do usuário"
- ✅ KR específico: "Reduzir o NPS de churn de 25 para 15 pontos"

---

## Roadmap de Produto

### Tipos de Roadmap

| Tipo | Horizonte | Audiência | Formato |
|---|---|---|---|
| **Estratégico** | 12-24 meses | C-Level, Board | Temas / Apostas |
| **Tático** | 3-6 meses | Stakeholders, áreas | Features por trimestre |
| **Sprint** | 2-4 semanas | Time de engenharia | Stories / Tasks |

---

### Template: Roadmap Trimestral

```
ROADMAP PRODUTO — [Nome do produto]
Período: [Q1/Q2/Q3/Q4] [Ano]
Última atualização: [Data]
Owner: [PM]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEMA 1: [Ex: Ativação e Onboarding]
Objetivo: [Por que esse tema é foco agora?]

✅ Entregue:
  - [Feature A] — impacto: [resultado observado]

🚧 Em andamento (Este quarter):
  - [Feature B] — [Squad X] — Status: [Em design / Em dev / Em QA]
  - [Feature C] — [Squad Y] — Status: [Em design]

📋 Próximo quarter (Planejado):
  - [Feature D] — dependência: [X]
  - [Feature E] — pendente: [decisão de negócio Y]

💡 Backlog (Futuro / Sem data):
  - [Ideia F] — hipótese a validar
  - [Ideia G] — aguardando capacidade

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEMA 2: [Ex: Retenção e Engajamento]
[Repetir estrutura acima]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEMA 3: [Ex: Infraestrutura de Produto / Tech Debt]
[Repetir estrutura acima]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LEGENDA DE STATUS:
🔴 Bloqueado   🟡 Em risco   🟢 No prazo   ✅ Entregue   📋 Planejado   💡 Backlog
```

---

### Template: Roadmap Now / Next / Later

Ideal para comunicar visão sem comprometer datas.

```
ROADMAP: [Nome do Produto]
Formato: Now / Next / Later

┌─────────────────────────────────────────────────────────────────┐
│  NOW (Este quarter — Alta confiança)                            │
├─────────────────────────────────────────────────────────────────┤
│  • [Feature A] — 🟢 Em progresso — Squad X                     │
│  • [Feature B] — 📋 Pronta para dev — Squad Y                  │
│  • [Melhoria C] — 🟢 Em QA — Squad X                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  NEXT (Próximo quarter — Confiança média)                       │
├─────────────────────────────────────────────────────────────────┤
│  • [Feature D] — dependência: integração com [API X]            │
│  • [Feature E] — discovery em andamento                         │
│  • [Melhoria F] — aguardando estimativa de engenharia           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LATER (Futuro — Direção, sem compromisso de data)              │
├─────────────────────────────────────────────────────────────────┤
│  • [Iniciativa G] — hipótese ainda a validar                    │
│  • [Plataforma H] — depende de escala / fundraise               │
│  • [Feature I] — baixa prioridade agora                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### Template: Plano de Sprint

```
SPRINT [número] — [Nome do time/squad]
Período: [DD/MM] a [DD/MM/AAAA]
Sprint Goal: [Uma frase que descreve o resultado esperado do sprint]

Capacidade do time: [X story points]

Stories comprometidas:
| ID | Título | Points | Responsável | Status |
|---|---|---|---|---|
| US-001 | [Título] | 5 | Dev A | 🟢 Em progresso |
| US-002 | [Título] | 3 | Dev B | 📋 A fazer |
| US-003 | [Título] | 8 | Dev C + D | 🟡 Bloqueado: [motivo] |

Total comprometido: [X] points

Bugs incluídos:
| ID | Severidade | Título |
|---|---|---|
| BUG-045 | Alto | [Título] |

Dependências externas:
- [Aguardando resposta do time de infraestrutura sobre X]
- [Design da tela Y deve estar aprovado até dia Z]

Definição de "Sprint Concluído com Sucesso":
- Sprint Goal atingido
- Todos os "Must have" entregues e aprovados pelo PM
- Zero bugs críticos em produção introduzidos pelo sprint
```
