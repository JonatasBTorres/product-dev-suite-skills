# Playbook 11 — Infraestrutura como Código & CI/CD

## Escopo

Ferramentas e práticas de Infrastructure as Code (Terraform/Pulumi/CDK), GitOps, estratégia de ambientes, modelo de branching, e arquitetura de pipeline de CI/CD. Use este playbook para "como organizo minha infraestrutura como código", "Terraform vs. Pulumi", ou "como desenho meu pipeline de deploy".

> **Nota de calibração (ver Tiers no `SKILL.md`):** IaC básico (mesmo que um único módulo Terraform simples) já vale a partir de Tier 0 — a alternativa (clicar no console e não lembrar o que foi feito) custa caro no primeiro incidente. GitOps completo, múltiplas contas por ambiente com blast radius isolado, e plataforma de self-service (IDP, ver playbook 09) tipicamente só se pagam a partir de Tier 2-3.

## Por que IaC não é opcional a partir de certo ponto

Infraestrutura provisionada manualmente ("cliquei no console") não é reprodutível, não é revisável por PR, e sofre de *drift* silencioso (o estado real diverge do que alguém acha que está configurado). IaC resolve isso tratando infraestrutura como qualquer outro artefato de código: versionado, revisado, testável, com histórico de mudança auditável.

## Framework de escolha de ferramenta

| Ferramenta | Modelo | Quando escolher |
|---|---|---|
| **Terraform** | Declarativo (HCL), multi-cloud, o padrão de facto do mercado | Ponto de partida padrão para a maioria dos casos — maior ecossistema de módulos prontos e de profissionais que já conhecem a ferramenta |
| **Pulumi** | Declarativo, mas escrito em linguagem de programação real (TypeScript/Python/Go) | Quando a lógica de provisionamento é genuinamente complexa (loops, condicionais elaborados, reuso de lógica de negócio já existente no time) e vale a pena trocar HCL por uma linguagem de propósito geral |
| **AWS CDK / CDKTF** | Abstração de alto nível que compila para CloudFormation (CDK) ou Terraform (CDKTF) | Times fortemente investidos em um único provedor (CDK-AWS) que querem componentes reutilizáveis com defaults sensatos de mais alto nível que módulos Terraform crus |
| **Crossplane / Config Connector** | Infraestrutura de nuvem gerenciada via CRDs do Kubernetes | Quando o time já opera Kubernetes como plataforma central e quer que toda infraestrutura (inclusive cloud) seja reconciliada pelo mesmo control plane |

**Regra prática:** Terraform é a escolha padrão segura na ausência de um motivo específico para outra coisa — o custo de "todo mundo no mercado já sabe Terraform" geralmente supera qualquer vantagem marginal de outra ferramenta, a menos que a complexidade de lógica realmente justifique Pulumi.

## Organização e gestão de estado

- **Módulos reutilizáveis, parametrizados por ambiente** — nunca duplique a definição inteira de infraestrutura por ambiente (dev/staging/prod); um módulo único parametrizado por variáveis evita que os ambientes divirjam silenciosamente ao longo do tempo.
- **State remoto com lock** (backend S3+DynamoDB para Terraform, ou uma plataforma gerenciada como Terraform Cloud/Spacelift/env0) — state local em produção é a receita para corrupção de estado quando duas pessoas aplicam ao mesmo tempo, e para "funciona só na minha máquina" quando o laptop de quem aplicou originalmente não está mais disponível.
- **Segregação de blast radius**: separe state (e idealmente conta/projeto de nuvem) por ambiente e, em escala maior, por domínio/produto — um erro de `terraform apply` em um módulo não deveria conseguir afetar recursos de um domínio completamente não relacionado.

## GitOps

- Modelo onde o estado desejado da infraestrutura/aplicação vive declarado em Git, e um operador (ArgoCD/Flux, tipicamente para Kubernetes) reconcilia continuamente o estado real para bater com o que está declarado — sem alguém rodando `kubectl apply` manualmente.
- Vantagens práticas: toda mudança é um commit (auditoria automática de "quem mudou o quê e quando"), rollback é um `git revert` (não uma sequência manual de comandos sob pressão durante um incidente), e o operador corrige drift automaticamente se alguém mudar algo manualmente por engano.
- Mais valioso quanto mais times/serviços compartilham a mesma plataforma — em Tier 0-1 com uma única aplicação simples, um pipeline de CI/CD tradicional (sem o operador de reconciliação contínua) já é suficiente.

## Estratégia de ambientes

- **Paridade real entre ambientes**: dev/staging/prod deveriam usar o mesmo módulo de IaC parametrizado, não configurações mantidas manualmente em paralelo que divergem ao longo do tempo — "funciona em staging mas não em produção" é frequentemente sintoma de paridade quebrada, não de um bug de aplicação.
- **Promoção de artefato, não rebuild por ambiente**: a mesma imagem de container/artefato de build que passou em staging é exatamente a que sobe para produção (identificada por digest/hash, não reconstruída) — rebuildar por ambiente reintroduz a possibilidade de "compilou diferente" entre os dois.

## Modelo de branching: Trunk-Based vs. Gitflow

| Modelo | Como funciona | Quando usar |
|---|---|---|
| **Trunk-Based Development** | Commits pequenos e frequentes direto (ou quase direto, via PR de vida curta) na branch principal; funcionalidade incompleta fica escondida atrás de feature flags (ver playbook 09) em vez de isolada em uma branch de longa duração | Padrão recomendado para times com CI/CD maduro e deploy contínuo — reduz drasticamente o custo de merge e mantém a branch principal sempre deployável |
| **Gitflow** (branches de release/develop/feature de longa duração) | Funcionalidades se desenvolvem em branches isoladas por período extenso, integradas em ciclos de release programados | Faz mais sentido quando o ciclo de release não é contínuo por natureza (ex: aplicativo mobile com aprovação de loja demorada, firmware/software embarcado com processo de certificação) — fora desses casos, tende a acumular "merge hell" e atrasar feedback |

## Arquitetura de pipeline de CI/CD

Estágios recomendados, na ordem (cada estágio só roda se o anterior passou — fail fast):

1. **Lint/format** — feedback mais rápido possível, antes de qualquer coisa custosa.
2. **Testes unitários** — rápidos, isolados, rodam a cada commit.
3. **Build do artefato** (imagem de container, pacote) — uma única vez, promovido depois entre ambientes.
4. **Scan de segurança e SBOM** (Trivy/Grype — ver playbook 01 e 08) — gate obrigatório, não opcional "quando alguém lembrar".
5. **Testes de contrato/integração** (Pact — ver playbook 04) — contra dependências reais ou seus contratos publicados.
6. **Deploy em staging** + smoke tests automatizados.
7. **Deploy em produção** com estratégia de rollout apropriada (canary/blue-green — ver playbook 09) e critério de rollback automático baseado em métricas/SLOs (ver playbook 10).

**Regra prática:** todo estágio que hoje é feito manualmente ("alguém lembra de rodar o scan de segurança antes de mergear") vai eventualmente ser esquecido sob pressão de prazo — automatizar como gate obrigatório do pipeline é o que faz a prática realmente acontecer de forma consistente.

## Antipadrões comuns

- **Infraestrutura criada manualmente no console "só dessa vez, depois eu documento"** — o "depois" raramente acontece, e o recurso vira uma peça não-reproduzível e não-auditável da infraestrutura.
- **State do Terraform local, sem lock, compartilhado por e-mail/Slack** — corrupção de estado é questão de tempo assim que duas pessoas aplicam quase ao mesmo tempo.
- **Duplicar toda a definição de infraestrutura por ambiente** em vez de parametrizar um módulo único — os ambientes divergem silenciosamente até um incidente revelar a diferença.
- **Rebuildar o artefato em cada ambiente** em vez de promover o mesmo artefato — abre espaço para "funcionou no build de staging, falhou no de produção" por uma diferença sutil de toolchain/dependência.
- **Gate de segurança no pipeline "manual, quando alguém lembra"** — sob pressão de prazo, é a primeira coisa pulada.
- **Feature branches de vida longa** competindo com trunk-based sem feature flags — reintroduz o merge hell que o trunk-based existe para evitar.
