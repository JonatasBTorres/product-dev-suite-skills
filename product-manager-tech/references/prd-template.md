# PRD Template — Product Requirements Document

**Versão:** v[X.X]  
**Data:** [DD/MM/AAAA]  
**Autor(es):** [Nome do PM]  
**Status:** Draft / Em revisão / Aprovado  
**Stakeholders:** [Lista de squads, líderes e áreas envolvidas]
**Tier estimado:** [Tier 0/1/2/3 — ver seção de Tiers no SKILL.md; compartilhado com `arquiteto-software-senior`]

---

## Mapa de Documentos do Projeto

> Este PRD é o documento-raiz da cadeia de rastreabilidade (ver `references/rastreabilidade-e-handoff.md`). Os demais documentos derivam dele — preencha esta tabela conforme cada um for criado, e mantenha-a atualizada aqui mesmo (não só no índice mestre centralizado).

| Documento | Arquivo/ID | Relação com este PRD |
|---|---|---|
| Backlog & Sprints (produto) | | Implementa os requisitos de §6. Cada story referencia o REQ-XXX de origem. |
| Navigation Map | | Detalha telas e navegação dos módulos deste PRD (NAV-XXX). |
| Fluxos críticos | | Detalha fluxos de negócio de alto risco mencionados neste PRD (FLOW-XXX). |
| Arquitetura/RFC | | Implementa os requisitos não-funcionais de §7. Ver skill `arquiteto-software-senior` (ADR-XXX/DOC-XXX). |
| Backlog técnico & código | | Implementa as decisões de arquitetura. Ver skill `backend-engineer` (TASK-XXX/IMPL-XXX). |

---

## 1. Resumo Executivo

> Uma ou duas frases descrevendo o que este documento especifica e por que importa.

**Problema central:** [Qual dor ou oportunidade está sendo endereçada?]  
**Solução proposta:** [O que vamos construir, em alto nível?]  
**Impacto esperado:** [Qual resultado de negócio ou usuário esperamos?]

---

## 2. Contexto e Motivação

### 2.1 Background
Descreva o contexto que levou a esta iniciativa. Inclua:
- Dados quantitativos que embasam o problema (métricas, pesquisas, NPS, etc.)
- Contexto de mercado ou competitivo relevante
- Decisões anteriores que impactam esta spec

### 2.2 Oportunidade
- **Para o usuário:** [Como isso melhora a vida/trabalho do usuário?]
- **Para o negócio:** [Como isso impacta receita, retenção, eficiência?]
- **Custo de não fazer:** [O que acontece se não construirmos isso?]

### 2.3 Hipótese de valor
> "Acreditamos que [construindo X] para [usuário Y], vamos [resultado Z]. Saberemos que funcionou quando [métrica W] mudar em [direção/magnitude]."

---

## 3. Objetivos e Métricas de Sucesso

### 3.1 Objetivos do produto
| Objetivo | Métrica | Baseline atual | Meta | Prazo |
|---|---|---|---|---|
| [Ex: Aumentar ativação] | [Ex: % de usuários que completam onboarding] | [Ex: 45%] | [Ex: 65%] | [Ex: Q2 2025] |

### 3.2 Critérios de sucesso mínimo (MVP)
Liste o que **precisa** acontecer para considerar este lançamento bem-sucedido.

### 3.3 Métricas de guardrail
Métricas que **não devem piorar** durante o lançamento:
- [Ex: Taxa de churn não deve aumentar acima de X%]
- [Ex: Tempo médio de sessão não deve cair mais de Y%]

---

## 4. Usuários-Alvo

### 4.1 Perfis de usuário (Personas)

**Persona primária: [Nome]**
- **Quem é:** [Descrição demográfica e contextual]
- **O que tenta fazer:** [Jobs-to-be-done]
- **Dores atuais:** [Frustrações no processo atual]
- **Ganhos esperados:** [Como este produto/feature ajuda]

**Persona secundária: [Nome]** (se aplicável)
- [Mesmo formato acima]

### 4.2 Segmentos fora do escopo
Liste explicitamente usuários ou casos de uso que este produto **não** atende (neste momento).

---

## 5. Escopo

### 5.1 In-scope (O que vamos construir)
| # | ID (REQ) | Funcionalidade | Prioridade | Notas |
|---|---|---|---|---|
| 1 | REQ-001 | [Feature A] | Must have | |
| 2 | REQ-002 | [Feature B] | Should have | |
| 3 | REQ-003 | [Feature C] | Nice to have | |

### 5.2 Out-of-scope (O que NÃO vamos construir agora)
| Funcionalidade | Razão | Quando revisitar |
|---|---|---|
| [Feature X] | Complexidade alta / baixo impacto | Q3 |
| [Feature Y] | Dependência externa não resolvida | Pós-integração com [Sistema Z] |

### 5.3 Premissas e dependências
- **Premissas:** O que estamos assumindo como verdade para esta spec funcionar?
- **Dependências:** O que precisa existir ou ser entregue por outro time para isso funcionar?
- **Riscos:** Quais são os principais riscos de execução?

---

## 6. Requisitos Funcionais

> Para cada funcionalidade, descreva o comportamento esperado do sistema. Cada funcionalidade carrega o `REQ-XXX` correspondente da tabela de escopo (§5.1) — é esse ID que o backlog (`US-XXX`) e a arquitetura (`ADR-XXX`) vão referenciar de volta.

### 6.1 [Nome da Funcionalidade] (REQ-001)

**Descrição:** O que esta funcionalidade faz?

**Fluxo principal (Happy Path):**
1. [Passo 1: contexto inicial]
2. [Passo 2: ação do usuário ou sistema]
3. [Passo 3: resultado esperado]

**Fluxos alternativos:**
- **Fluxo A (condição X):** [O que acontece se...]
- **Fluxo B (condição Y):** [O que acontece se...]

**Edge cases e tratamento de erros:**
| Situação | Comportamento esperado |
|---|---|
| [Ex: Conexão perdida durante submit] | [Ex: Salvar draft localmente, tentar reenviar ao reconectar] |
| [Ex: Dados inválidos no formulário] | [Ex: Destacar campos com erro, mensagem específica por campo] |

**Regras de negócio:**
- RN-01: [Regra clara e testável]
- RN-02: [Regra clara e testável]

**Permissões:**
| Perfil | Pode fazer X? | Pode ver Y? | Pode editar Z? |
|---|---|---|---|
| Admin | ✅ | ✅ | ✅ |
| Usuário padrão | ✅ | ✅ | ❌ |
| Visitante | ❌ | ✅ | ❌ |

---

### 6.2 [Nome da Funcionalidade 2] (REQ-002)
[Repetir estrutura acima]

---

## 7. Requisitos Não-Funcionais

> Preencha com o mesmo nível de detalhe do `non-functional-requirements-checklist.md` da skill `arquiteto-software-senior` — isso evita retrabalho no handoff. Cada requisito não-funcional relevante também recebe seu próprio `REQ-XXX` (ex: REQ-010 = latência, REQ-011 = disponibilidade) para que o ADR correspondente possa referenciá-lo especificamente.

### 7.1 Performance
- Tempo de carregamento inicial: < [Xms] em [condição de rede]
- Tempo de resposta de API: < [Xms] para [percentil P95]
- Capacidade: suportar [N] usuários simultâneos sem degradação

### 7.2 Segurança
- Autenticação: [Mecanismo usado]
- Autorização: [Modelo de controle de acesso]
- Dados sensíveis: [Como são tratados, criptografados, mascarados]
- Compliance: [LGPD / GDPR / SOC2 / PCI-DSS — o que se aplica]

### 7.3 Disponibilidade e Confiabilidade
- SLA: [Ex: 99,9% de uptime]
- RPO (Recovery Point Objective): [Ex: máximo 1h de perda de dados]
- RTO (Recovery Time Objective): [Ex: sistema restaurado em até 4h]

### 7.4 Escalabilidade
- Volume esperado de dados: [Ex: 10k registros/dia]
- Crescimento projetado: [Ex: 3x em 12 meses]

### 7.5 Acessibilidade
- Nível de conformidade: [WCAG 2.1 AA — padrão recomendado]
- Requisitos específicos: [Ex: suporte a leitores de tela, contraste mínimo]

### 7.6 Internacionalização e Localização
- Idiomas suportados: [Ex: PT-BR, EN-US]
- Formatação de datas, moedas, números: [Ex: padrão pt-BR]
- Fuso horário: [Como datas/horas são armazenadas e exibidas?]

---

## 8. Especificação de Telas / Fluxos

> Liste cada tela principal e seus componentes. Para wireframes detalhados, referencie os designs no Figma.

### 8.1 [Nome da Tela]

**Link Figma:** [URL]  
**Objetivo:** [O que o usuário deve conseguir fazer aqui]  
**Entrypoints:** [De onde o usuário chega]

**Componentes e comportamentos:**
| Componente | Descrição | Comportamento |
|---|---|---|
| [Header] | [Barra superior com logo e nav] | [Sticky, colapsa em mobile] |
| [Botão CTA] | [Botão principal de ação] | [Disabled até validação completa] |

**Estados da tela:**
- **Vazio (zero state):** [O que aparece quando não há dados?]
- **Carregando:** [Skeleton, spinner, ou placeholder?]
- **Com dados:** [Comportamento padrão]
- **Erro:** [O que exibir quando algo falha?]
- **Offline:** [App funciona offline? O que é exibido?]

**Eventos de analytics a rastrear:**
- `screen_viewed` — toda vez que a tela é aberta
- `[action]_clicked` — clique em botões principais
- `[error]_shown` — quando um erro é exibido ao usuário

---

## 9. Integrações e APIs

### 9.1 APIs internas consumidas
| Endpoint | Método | Quando usar | Owner |
|---|---|---|---|
| `/api/v1/users/{id}` | GET | Carregar perfil do usuário | Time de Identidade |

### 9.2 Integrações externas
| Serviço | Finalidade | Contrato | Fallback se indisponível |
|---|---|---|---|
| [Stripe] | Pagamentos | [Link da doc] | [Bloquear checkout, exibir erro] |

### 9.3 Eventos e webhooks
| Evento | Trigger | Payload | Consumer |
|---|---|---|---|
| `user.created` | Novo cadastro | `{id, email, createdAt}` | CRM, E-mail marketing |

---

## 10. Plano de Lançamento

### 10.1 Estratégia de rollout
- [ ] Feature flag (% de usuários): [Plano de rollout gradual]
- [ ] Beta fechado: [Critérios de seleção]
- [ ] GA (General Availability): [Data prevista e critérios]

### 10.2 Plano de comunicação
| Audiência | Canal | Responsável | Data |
|---|---|---|---|
| Time interno | Slack #produto | PM | [Data] |
| Clientes beta | E-mail | Growth | [Data] |
| Todos os usuários | In-app + Blog | Marketing | [Data] |

### 10.3 Plano de rollback
- **Trigger de rollback:** [O que precisa acontecer para reverter?]
- **Processo:** [Passos para reverter, quem aciona]
- **Tempo estimado de rollback:** [Ex: < 30 minutos]

---

## 11. Perguntas em Aberto

| # | Pergunta | Owner | Prazo | Status |
|---|---|---|---|---|
| 1 | ⚠️ [Dúvida de negócio não resolvida] | [Nome] | [Data] | Pendente |
| 2 | ⚠️ [Dúvida técnica] | [Nome] | [Data] | Em análise |

---

## 12. Rastreabilidade

**Stories relacionadas (US-XXX):** [preenchido conforme o backlog de produto for criado]
**Fluxos críticos relacionados (FLOW-XXX):** [preenchido conforme documentos de fluxo forem criados]
**ADRs relacionados (ADR-XXX):** [preenchido após o handoff para `arquiteto-software-senior`]
**Documentos de arquitetura consolidados (DOC-XXX):** [ex: Arquitetura de Segurança]
**Backlog técnico e implementação (TASK-XXX/IMPL-XXX):** [preenchido após o handoff para `backend-engineer`]

> **Isto não é preenchimento automático.** Estes campos nascem vazios porque os documentos que eles referenciam ainda não existem no momento em que o PRD é escrito. Sempre que um US-XXX/FLOW-XXX/ADR-XXX/TASK-XXX novo for criado a partir deste PRD, volte a esta seção e atualize-a.
>
> Lembre-se também de atualizar o `indice-mestre-rastreabilidade-template.md` com os IDs REQ-XXX criados neste documento — ver `references/rastreabilidade-e-handoff.md`.

---

## 13. Histórico de Revisões

| Versão | Data | Autor | O que mudou |
|---|---|---|---|
| v0.1 | [Data] | [Nome] | Draft inicial |
| v0.2 | [Data] | [Nome] | Adicionado seção de métricas após revisão com dados |
| v1.0 | [Data] | [Nome] | Aprovado para desenvolvimento |
