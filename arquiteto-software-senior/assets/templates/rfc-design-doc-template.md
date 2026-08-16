# RFC: [Nome da iniciativa]

**Autor(es):**
**Status:** Rascunho | Em revisão | Aprovado | Implementado
**Data:**
**Revisores necessários:** [ex: segurança, plataforma, time X afetado]
**PRD de origem (se houver):** [link/nome do PRD]
**Requisitos relacionados (REQ-XXX):** [preenchido se este RFC nasceu de um PRD da skill de product management]

## 1. Resumo executivo

[2-3 frases: o que está sendo proposto e por quê. Alguém deveria entender o essencial lendo só esta seção.]

## 2. Contexto e motivação

[Qual problema de negócio ou técnico isso resolve? Por que agora? O que acontece se não fizermos nada (custo de não agir)?]

## 3. Requisitos

### Funcionais
-

### Não-funcionais (atributos de qualidade)
Preencha com base em `non-functional-requirements-checklist.md`. Destaque os 2-3 mais críticos que vão guiar as decisões de trade-off abaixo.

- **Escala esperada:**
- **Latência/throughput alvo:**
- **Disponibilidade alvo (SLA/SLO):**
- **Consistência:**
- **Segurança/compliance aplicável:**
- **Orçamento/restrição de custo:**

## 4. Não-objetivos (escopo explicitamente fora)

[Nomear o que este RFC deliberadamente não resolve evita debate difuso e discussão fora de escopo na revisão.]

## 5. Design proposto

[Descrição da solução. Inclua diagrama C4 (Contexto e Contêineres no mínimo — ver `c4-context.mmd` e `c4-container.mmd`) e, se necessário, Componentes para partes complexas.]

### 5.1 Visão geral da arquitetura

[Diagrama + explicação textual]

### 5.2 Modelo de dados (se aplicável)

### 5.3 Contratos/APIs (se aplicável)

[Ver playbook 04 para versionamento e compatibilidade]

### 5.4 Fluxos críticos

[Descreva o(s) fluxo(s) mais importantes passo a passo — especialmente caminhos de falha, não só o caminho feliz]

## 6. Alternativas consideradas

[Pelo menos uma alternativa real, com prós/contras — mesmo que rejeitada rapidamente, documentar por que evita retrabalho de "por que não fizemos X" meses depois.]

## 6.1 Resumo compacto de decisões técnicas (opcional, recomendado para RFCs com múltiplas decisões)

Tabela de referência rápida — um "ADR-lite" que resume as decisões principais sem exigir abrir cada ADR individual. Cada linha relevante ainda deveria ter um ADR completo por trás quando a decisão for genuinamente significativa/difícil de reverter:

| Decisão | Escolha | Justificativa |
|---|---|---|
| | | |

## 7. Riscos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| | | | |

## 8. Plano de rollout

[Estratégia de deploy — ver playbook 09 (feature flags, canary, blue/green). Plano de rollback explícito.]

## 9. Impacto operacional

- **Observabilidade:** que métricas/logs/traces novos são necessários?
- **On-call:** este sistema gera novo runbook ou responsabilidade de plantão?
- **Custo estimado (FinOps):** ver playbook 09

## 10. Decisões arquiteturais decorrentes

[Liste quais ADRs este RFC vai gerar — decisões específicas e potencialmente caras de reverter, extraídas deste documento maior.]

## Histórico de Revisões

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| v1.0 | | | Versão inicial |

> Sempre que este documento for revisado por uma auditoria/revisão de consistência (não apenas um ajuste pequeno), registre aqui o que mudou e por quê — "correção item N" referenciando um `registro-de-auditoria-template.md` (skill `gerente-de-produto`) se houver um. Isso é o que permite, meses depois, responder "por que isso mudou?" sem precisar reconstruir o raciocínio do zero.
