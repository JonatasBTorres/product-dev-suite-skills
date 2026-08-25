# Backlog de Produto: [Nome do Produto/Iniciativa]

> Este é o backlog de **produto** — cada item (`US-XXX`) descreve valor para o usuário e nasce de um `REQ-XXX` do PRD. Diferente do backlog técnico (`TASK-XXX`, mantido por `backend-engineer`), que descreve a unidade de trabalho de engenharia que implementa esta story. Para escrever cada story individual (formato, critérios de aceite em Gherkin, DoR/DoD, estimativa), ver `user-stories.md` — este template cobre como **organizar** N stories em épicos e sprints.

## Posição no Conjunto de Documentos

> Este backlog implementa os requisitos do PRD. Ao planejar cada sprint, consulte também os fluxos críticos e o navigation map relevantes.

| Sprint | REQ de origem | Documentos relacionados |
|---|---|---|
| | | FLOW-XXX / NAV-XXX |

---

## Como organizar este backlog (documento único vs. fatiado)

**Padrão: documento único.** Um backlog é uma lista viva e constantemente reordenada — mover uma story entre sprints deve ser editar uma linha, não recortar de um arquivo e colar em outro. Documento único também mantém o backlog não-priorizado (itens ainda sem sprint) num lugar natural, e permite responder "o que ainda falta?" com uma leitura só.

**Quando fatiar em vários arquivos:** a partir de ~80-100 stories, ou quando múltiplos times editam o mesmo repositório em paralelo (conflitos de merge frequentes no mesmo arquivo).

**Como fatiar, se fatiar: por épico, nunca por sprint.** Épico é estrutura estável (dura meses); alocação de sprint muda toda semana — fatiar por sprint congela justamente a dimensão mais volátil, e força mover conteúdo entre arquivos a cada repriorização.

> ⚠️ **Se fatiar, a rastreabilidade precisa de proteção explícita** — sem isso o índice mestre continua "correto" mas deixa de ser útil para localizar qualquer coisa:
> - Este documento-raiz mantém obrigatoriamente o índice de épicos abaixo, apontando qual arquivo contém qual épico.
> - O `indice-mestre-rastreabilidade-template.md` registra, para cada `US-XXX`, em qual arquivo ela vive (não apenas "backlog").
> - O backlog não-priorizado permanece no documento-raiz, nunca distribuído entre os arquivos de épico.

### Índice de Épicos (preencher apenas se o backlog estiver fatiado)

| Épico | REQ de origem | Arquivo | Stories |
|---|---|---|---|
| | REQ-XXX | `backlog-epico-xxx.md` | US-XXX a US-YYY |

---

## Épico: [Nome do épico] — origem: REQ-XXX

**Objetivo do épico:** [Que resultado de produto este conjunto de stories entrega]
**Métrica de sucesso relacionada:** [OKR-XXX ou métrica do PRD]

### Stories

<!-- Cada story segue o formato completo de `user-stories.md` (Como/Quero/Para,
critérios de aceite em Gherkin, DoR/DoD, estimativa). Aqui listamos a organização;
o detalhamento de cada uma vive no formato padrão da story.
Nunca copie o texto do REQ inteiro — referencie o ID. -->

| ID | Título | REQ de origem | Estimativa | Prioridade | Sprint | Status |
|---|---|---|---|---|---|---|
| US-001 | | REQ-XXX | | Must have | Sprint 1 | A fazer |
| US-002 | | REQ-XXX | | Should have | — | Backlog |

---

## Backlog não-priorizado

> Stories já escritas mas ainda sem sprint alocado. Mantenha sempre neste documento-raiz, mesmo quando o backlog estiver fatiado por épico.

| ID | Título | REQ de origem | Estimativa | Prioridade | Motivo de não estar alocada |
|---|---|---|---|---|---|
| | | | | | |

---

## Sprint Planning

**Sprint:** [número/nome]
**Sprint Goal:** [Um objetivo de produto, não uma lista de tarefas]
**Capacidade estimada:** [pontos ou stories, baseada na velocidade histórica]
**Stories selecionadas:** [lista de US-XXX]

> Ver `user-stories.md` para o Definition of Ready — nenhuma story entra em sprint sem passar por ele.

## Notas de Refinamento

[Registre decisões de refinamento — especialmente quando uma story foi quebrada por complexidade descoberta, quando uma estimativa divergiu muito (e por quê), ou quando uma story foi despriorizada e o motivo.]

## Resumo Executivo dos Sprints

| Sprint | Foco principal | Pontos est. | REQs atendidos | Entrega |
|---|---|---|---|---|
| | | | | |

**Total:** [pontos] | [N] stories | [N] sprints

---

**Lembrete de rastreabilidade:** toda story nova (`US-XXX`) precisa entrar no `indice-mestre-rastreabilidade-template.md` com seu `REQ-XXX` de origem — e, se o backlog estiver fatiado, com o arquivo onde ela vive. Ver `rastreabilidade-e-handoff.md`.
