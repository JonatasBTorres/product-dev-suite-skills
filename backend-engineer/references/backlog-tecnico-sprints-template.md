# Backlog Técnico: [Nome do Produto/Épico Técnico]

> Este é o backlog de **implementação** — diferente do backlog de produto (`US-XXX`, mantido por `product-manager-tech`), que descreve valor de negócio. Aqui, cada item (`TASK-XXX`) é uma unidade de trabalho de engenharia concreta, tipicamente menor e mais técnica que uma user story, e sempre referencia de onde veio.

## Posição no Conjunto de Documentos

> Este backlog técnico implementa as user stories de produto e/ou as decisões de arquitetura. Ao planejar cada sprint técnico, consulte também os ADRs e o modelo de dados relevantes.

| Sprint técnico | US/ADR de origem | Documentos obrigatórios |
|---|---|---|
| | | |

---

## Como organizar este backlog (documento único vs. fatiado)

**Padrão: documento único.** Um backlog é uma lista viva e constantemente reordenada — mover uma task entre sprints deve ser editar uma linha, não recortar de um arquivo e colar em outro.

**Quando fatiar:** a partir de ~80-100 tasks, ou quando múltiplos times editam o mesmo repositório em paralelo.

**Como fatiar, se fatiar: por épico técnico, nunca por sprint.** Épico é estrutura estável; alocação de sprint muda toda semana.

> ⚠️ **Se fatiar, proteja a rastreabilidade:** este documento-raiz mantém obrigatoriamente um índice apontando qual arquivo contém qual épico técnico, e o `indice-mestre-rastreabilidade-template.md` registra, para cada `TASK-XXX`, em qual arquivo ela vive. Tasks ainda não alocadas a sprint permanecem no documento-raiz.

### Índice de Épicos Técnicos (preencher apenas se fatiado)

| Épico técnico | US/ADR de origem | Arquivo | Tasks |
|---|---|---|---|
| | | `backlog-tecnico-epico-xxx.md` | TASK-XXX a TASK-YYY |

---

## Épico Técnico: [Nome] — origem: US-XXX / ADR-XXX

**Objetivo técnico:**
**Sprint Goal técnico (se aplicável):**

### Definition of Ready (DoR) — aplicada a toda task abaixo antes de entrar em sprint

- [ ] `ADR-XXX` relevante já foi aceito (não iniciar implementação com decisão ainda "Proposta")
- [ ] Modelo de dados e stack já definidos pela arquitetura (`stack-tecnologica-template.md`, `modelo-de-dados-template.md`)
- [ ] Dependências entre tasks identificadas
- [ ] Estimada pelo time

### Definition of Done (DoD) — aplicada a toda task antes de ser fechada

- [ ] Código revisado (aprovado por ≥1 dev)
- [ ] Testes unitários e de integração passando no CI
- [ ] Sem `// TODO: implementar` — código completo e funcional
- [ ] Tratamento de erros explícito, sem exceção silenciada
- [ ] Logs estruturados e métricas nos pontos críticos (ver `references/observability.md`)
- [ ] Segurança: sem secret no código, inputs validados, queries parametrizadas
- [ ] Documentação/README atualizado se mudou forma de rodar
- [ ] PR cita o `TASK-XXX`/`ADR-XXX`/`US-XXX` de origem

## Tasks

### TASK-001: [Título curto e técnico]

- **Descrição:** [O que precisa ser implementado, em termos técnicos]
- **User story de origem:** US-XXX
- **ADR de origem (se a implementação segue uma decisão de arquitetura):** ADR-XXX
- **Componente/serviço afetado:**
- **Estimativa (story points ou horas):**
- **Status:** Backlog | Pronta (DoR ok) | Em progresso | Em revisão | Feita (DoD ok)
- **Sprint técnico:**

**Critérios técnicos de aceite:**
```
DADO  [contexto/estado do sistema]
QUANDO [ação/chamada/evento]
ENTÃO [resultado técnico esperado — status code, estado do banco, evento emitido]
```

<!-- Duplique o bloco acima para cada nova task. Nunca copie o texto da US ou do
ADR inteiro — referencie o ID e descreva só o que é específico da implementação. -->

## Sprint Planning Técnico

**Sprint:** [número/nome]
**Sprint Goal técnico:**
**Capacidade estimada:**
**Tasks selecionadas:** [lista de TASK-XXX]

## Notas de Refinamento Técnico

[Registre aqui decisões técnicas discutidas durante o refinamento — especialmente quando uma task foi quebrada em partes menores por complexidade descoberta, ou quando uma estimativa divergiu muito e o motivo da divergência.]

## Resumo Executivo dos Sprints Técnicos

| Sprint | Foco principal | Pontos est. | ADRs implementados | Entrega |
|---|---|---|---|---|
| | | | | |

**Total:** [pontos] | [N] Tasks | [N] sprints técnicos

---

**Lembrete de rastreabilidade:** toda task nova (`TASK-XXX`) precisa entrar no `indice-mestre-rastreabilidade-template.md` (mantido por `product-manager-tech`) com sua `US-XXX`/`ADR-XXX` de origem. Se um `ADR-XXX` mudar depois que uma task já foi implementada com base nele, sinalize a task correspondente para reavaliação em vez de deixar divergir silenciosamente.
