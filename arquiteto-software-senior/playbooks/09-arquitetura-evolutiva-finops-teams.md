# Playbook 09 — Arquitetura Evolutiva, FinOps & Team Topologies

## Escopo

Como manter a arquitetura evoluível ao longo do tempo (fitness functions, deploy seguro), como pensar em custo de nuvem como responsabilidade de engenharia (FinOps), e como desenhar a organização do time em torno da arquitetura (Conway's Law, Team Topologies). Use este playbook para "como evoluímos isso sem reescrever tudo", "como reduzimos custo de nuvem", ou "como devíamos estruturar os times".

> **Nota de calibração (ver Tiers no `SKILL.md`):** feature flags simples e FinOps básico (rightsizing, lifecycle de storage) se pagam desde Tier 0 — são baratos e o retorno é imediato. Fitness functions automatizadas e a discussão de Team Topologies (Platform/Enabling/Complicated-subsystem) só fazem sentido a partir de Tier 2, quando existe mais de um time — com 1 time só, "Team Topologies" é prematuro por definição. Detalhes de execução de pipeline (como automatizar canary/blue-green na prática) estão no playbook 11.

## Fitness Functions Arquiteturais

Uma fitness function é um teste automatizado que verifica se a arquitetura continua respeitando uma regra estrutural desejada — trata regras arquiteturais (que normalmente vivem só em documentação ou na cabeça do arquiteto) como testes que rodam no CI, com o mesmo rigor de testes funcionais.

- **ArchUnit** (Java) / **Packwerk** (Ruby) e equivalentes em outras linguagens: verificam automaticamente coisas como "o módulo de domínio não pode importar nada do módulo de infraestrutura", "o pacote de billing não pode ser importado diretamente por outro bounded context sem passar pela interface pública dele", ou "nenhuma classe do pacote `legacy` pode ser referenciada por código novo".
- **Por que isso importa mais do que parece**: a arquitetura desenhada em um diagrama (ver playbook 03) degrada naturalmente ao longo de meses de pressão de prazo, a menos que haja um mecanismo automatizado que impeça a violação de acontecer silenciosamente em um PR aprovado sem essa verificação. Fitness functions são a diferença entre "a arquitetura como intenção" e "a arquitetura como ela realmente é".
- Comece com poucas regras de altíssimo valor (direção de dependência entre camadas, isolamento entre bounded contexts) em vez de tentar codificar toda regra arquitetural de uma vez — regras demais cedo geram atrito e resistência do time.

## Deploy & Rollout Seguro

### Framework de escolha de estratégia de rollout

| Estratégia | Como funciona | Quando usar |
|---|---|---|
| **Feature Flags / Dynamic Config** (OpenFeature, LaunchDarkly) | Código de uma nova funcionalidade já está em produção, mas desligado; ativação é controlada em runtime, sem novo deploy | Separar **deploy** de **release** — permite deployar continuamente e liberar a funcionalidade para usuários quando (e para quem) fizer sentido de negócio, independentemente do ciclo de deploy |
| **Canary** | Nova versão recebe uma fatia pequena do tráfego real; se métricas de saúde permanecem normais, a fatia cresce gradualmente até 100% | Mudanças de risco moderado a alto onde se quer limitar o *blast radius* de um problema não detectado em teste, com rollback automático se as métricas degradarem |
| **Blue/Green** | Ambiente novo (green) sobe completo em paralelo ao antigo (blue); tráfego é comutado de uma vez (ou quase) quando validado | Quando a mudança não é seguramente "gradual" (ex: migração de schema incompatível durante a transição) e comutação instantânea com rollback rápido (voltar o tráfego para blue) é mais segura que uma transição gradual |
| **Shadow Traffic / Traffic Mirroring** | Tráfego real é duplicado para a nova versão, mas a resposta da nova versão nunca é retornada ao usuário — só observada | Validar comportamento/performance de uma reescrita ou nova versão contra tráfego de produção real, sem nenhum risco ao usuário, antes de expor de fato via canary |
| **Branching by Abstraction** | Em vez de uma feature branch de longa duração, o código antigo e o novo coexistem no mesmo branch principal atrás de uma abstração/flag, alternável em runtime | Refatorações grandes/migrações que levariam semanas — evita o custo de merge de uma branch de longa duração divergindo do `main` |

**Auto-rollback**: qualquer uma dessas estratégias (especialmente canary) deveria ter critério de rollback automático baseado em métricas (taxa de erro, latência p99, métricas de negócio específicas), não depender de alguém notando manualmente um dashboard às 2h da manhã.

**Conexão com o plano de lançamento por fases:** se a conversa envolver um PRD da skill `gerente-de-produto`, o plano de lançamento dele (Alpha → Sandbox → Piloto Fechado → Beta → GA) já deveria ter gates de segurança/compliance amarrados a fases específicas — a estratégia de deploy aqui (feature flags, canary) é o mecanismo técnico que implementa essas fases na prática. A flag mais crítica de um sistema com módulo de risco (pagamento, dado sensível) deveria ter *default* desligado em todos os ambientes até o gate correspondente ser satisfeito — não apenas em produção.

## FinOps

FinOps trata custo de nuvem como uma métrica de engenharia tão relevante quanto latência ou disponibilidade — visível, atribuível e otimizável continuamente, não uma surpresa descoberta na fatura mensal pelo time financeiro.

### Alavancas práticas, por ordem de impacto/esforço

1. **Dimensionamento correto (rightsizing)** de compute e storage com base em utilização real (não em "achismo" de quando o serviço foi criado) — instâncias superdimensionadas "por segurança" são a fonte mais comum e mais fácil de corrigir de desperdício.
2. **Lifecycle de storage** (S3/GCS tiers — ver playbook 02): dados que perdem valor de acesso com o tempo devem migrar automaticamente para tiers mais baratos via política, não por ação manual esquecida.
3. **Instâncias Spot/Preemptible** para cargas tolerantes a interrupção (workers assíncronos, jobs batch, ambientes de teste) — geralmente 60-90% mais baratas que On-Demand.
4. **Minimização de custo de egress de rede**: tráfego entre regiões e saindo para a internet é frequentemente o custo "invisível" que ninguém rastreia até a fatura chegar — desenhe topologia de rede e colocação de serviços considerando isso explicitamente (ex: manter serviços que trocam grande volume de dados na mesma região/AZ).
5. **Alocação de custo visível por time/produto/tenant** (tags/labels obrigatórios em todo recurso provisionado) — sem isso, "reduzir custo" não tem dono nem prioridade clara, porque ninguém enxerga o próprio impacto.

### Como isso se conecta a decisões de arquitetura

Toda recomendação de infraestrutura em qualquer outro playbook deveria vir acompanhada de uma noção de custo — "tecnicamente correto e financeiramente inconsciente" não é uma boa recomendação de arquiteto sênior. Ex: recomendar Kubernetes para uma carga que cabe em Cloud Run deveria mencionar o custo operacional adicional, não só as capacidades técnicas.

## Organização & Plataforma

### Lei de Conway

"Organizações que desenham sistemas são obrigadas a produzir designs que são cópias da estrutura de comunicação dessas organizações." Na prática: a estrutura de times **vai** se refletir na arquitetura, quer isso seja planejado ou não. A implicação de arquiteto sênior é **desenhar a estrutura de times deliberadamente para produzir a arquitetura desejada** (Conway reverso), em vez de desenhar a arquitetura ignorando como os times realmente estão organizados e depois se surpreender quando a realidade diverge do diagrama.

### Team Topologies — os 4 tipos de time

| Tipo de time | Responsabilidade | Exemplo |
|---|---|---|
| **Stream-aligned** | Entrega de valor de ponta a ponta para um fluxo de negócio específico, com autonomia de deploy | Time de Checkout, Time de Onboarding |
| **Platform** | Fornece capacidades self-service (infraestrutura, CI/CD, observabilidade) que os times stream-aligned consomem sem precisar entender os detalhes internos | Plataforma interna que expõe "deploy um serviço" como um botão/API, não uma sequência de tickets |
| **Enabling** | Ajuda times stream-aligned a adquirir uma capacidade que faltam (ex: um time de segurança/DX que trabalha *com* outros times por um período, depois sai) — não é um time que **faz o trabalho** por eles indefinidamente | Time de Developer Experience ajudando squads a adotar uma nova prática de teste |
| **Complicated-subsystem** | Encapsula uma área que exige expertise profunda e especializada (ex: um motor de precificação com matemática financeira complexa) atrás de uma interface simples para os demais times | Time de um motor de matching/pricing algorítmico |

**Regra prática:** a maioria dos times deveria ser stream-aligned; os outros três tipos existem para que os stream-aligned consigam entregar valor rápido sem precisar reinventar plataforma, expertise de nicho ou capacidades novas cada um por conta própria.

### Internal Developer Platforms (IDP)

Quando o número de times stream-aligned cresce, a demanda de cada um sobre a plataforma se torna o gargalo se a plataforma for entregue via tickets/atendimento manual. Uma IDP boa expõe **self-service com paved roads** (caminhos pré-aprovados e com boas práticas embutidas — deploy, provisionamento de banco, observabilidade) — o time de plataforma vira um produto interno com "clientes" (os times stream-aligned), não um gargalo de aprovação manual.

## Antipadrões comuns

- **Fitness functions nunca escritas — regras arquiteturais vivem só em um documento que ninguém consulta no dia a dia** — a arquitetura real diverge silenciosamente do diagrama ao longo dos meses.
- **Deploy e release tratados como a mesma coisa**: sem feature flags, todo deploy é automaticamente uma release completa para 100% dos usuários, eliminando a possibilidade de rollout gradual/reversível.
- **FinOps reativo**: só olhar custo quando a fatura já veio alta, em vez de ter alocação de custo visível por time desde o início.
- **Ignorar a Lei de Conway e depois culpar "falta de disciplina" do time** quando a arquitetura não corresponde ao diagrama — se dois times têm que coordenar toda mudança em um "serviço compartilhado", a arquitetura vai naturalmente tender a virar um distributed monolith, independente da intenção original.
- **Time de plataforma virando gargalo de tickets** em vez de expor self-service real — o sintoma clássico é squads reclamando que "toda infraestrutura demora semanas".
- **Enabling team que nunca sai**: um time criado para "ajudar temporariamente" que na prática passa a fazer o trabalho permanentemente pelos times stream-aligned, criando dependência em vez de capacidade.
