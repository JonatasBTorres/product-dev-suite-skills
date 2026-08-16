# Playbook 03 — Padrões de Arquitetura, DDD & Diagramação

## Escopo

Estilos arquiteturais estruturais, Domain-Driven Design, escolha de protocolo de comunicação entre serviços, e como documentar/diagramar decisões (C4 Model + ADRs). Use este playbook sempre que a pergunta for "como estruturo isso" ou "monolito vs. microsserviços vs. X".

> **Nota de calibração (ver Tiers no `SKILL.md`):** Monolito Modular + Clean/Hexagonal se paga em qualquer tier, inclusive Tier 0. CQRS, Event Sourcing e Saga só compensam a partir de Tier 2, quando o requisito concreto que justifica cada um (ver abaixo) realmente existe. Se o contexto for evoluir um sistema legado em vez de desenhar do zero, veja também o playbook 12 para a execução prática do Anticorruption Layer via Strangler Fig.

## Framework de decisão: monolito modular vs. microsserviços vs. EDA

A pergunta errada é "monolito ou microsserviços?" — a pergunta certa é "o que o meu domínio e meu time realmente precisam agora?". Ordem recomendada de evolução:

1. **Monolito Modular** — ponto de partida padrão para a esmagadora maioria dos produtos novos, mesmo com ambição de escala futura. Organize por **bounded context** (módulos com fronteiras claras, comunicação interna só por interfaces explícitas, sem acesso direto a tabelas de outro módulo) desde o início. Isso é o que torna a extração futura para microsserviços barata, caso necessário.
2. **Clean / Hexagonal / Onion Architecture** dentro do monolito (ou de cada serviço): separe domínio (regras de negócio puras, sem dependência de framework/infra) de portas/adaptadores (banco, fila, API externa). Isso é ortogonal à discussão monolito vs. microsserviços — aplica-se aos dois.
3. **Microsserviços** — justificados quando pelo menos um destes é verdade: (a) times diferentes precisam de deploy independente com cadência muito diferente; (b) partes do domínio têm requisitos de escala/tecnologia radicalmente diferentes (ex: um serviço de recomendação com ML pesado vs. CRUD simples); (c) isolamento de falha é requisito de negócio (um módulo não pode derrubar o resto). Extrair microsserviço **sem** um desses motivos concretos normalmente só importa a complexidade distribuída (rede, consistência eventual, observabilidade, deploy) sem ganho correspondente.
4. **Event-Driven Architecture (EDA)** — quando o desacoplamento temporal entre produtor e consumidor é o requisito central (ex: múltiplos sistemas reagem ao mesmo fato de negócio sem o produtor precisar saber quem são). Traz complexidade real (consistência eventual, debugging distribuído, ordenação de eventos) — não adote "porque é a arquitetura moderna".

### CQRS e Event Sourcing — quando valem a complexidade

- **CQRS** (separar modelo de escrita e leitura): justificado quando o padrão de leitura é muito diferente do de escrita (ex: múltiplas views agregadas/denormalizadas para consulta, alta relação leitura:escrita). Pode ser adotado *sem* Event Sourcing — CQRS com dois modelos sobre o mesmo banco relacional já resolve boa parte dos casos.
- **Event Sourcing** (estado = replay de eventos, não snapshot atual): justificado quando auditoria completa é requisito de negócio (financeiro, saúde, compliance) ou quando reconstruir estado passado / "time travel" tem valor real. Custo: complexidade de versionamento de eventos, snapshotting para performance, e uma curva de aprendizado que a maioria dos times subestima. **Não adote Event Sourcing só para ganhar CQRS** — são decisões independentes.

### Padrões de consistência distribuída

- **Outbox Pattern**: use sempre que uma operação precisar atualizar o banco **e** publicar um evento de forma atômica (evita o problema clássico de "salvei no banco mas a publicação do evento falhou"). Escreva o evento na mesma transação do banco (tabela outbox), com um processo separado (CDC/poller) publicando de fato na fila/tópico.
- **Saga** — para transações de negócio que cruzam múltiplos serviços sem transação distribuída (2PC é geralmente uma escolha ruim em sistemas distribuídos modernos por acoplamento e disponibilidade):
  - **Orchestrated Saga**: um orquestrador central comanda cada passo e compensações. Mais fácil de entender e depurar; ponto único de coordenação (não confundir com ponto único de falha — o orquestrador não guarda estado de negócio, só o fluxo).
  - **Choreographed Saga**: cada serviço reage a eventos e publica o próximo, sem coordenador central. Mais desacoplado, porém mais difícil de visualizar o fluxo completo e depurar quando algo trava no meio — só compensa em sagas curtas (poucos passos).
  - Regra prática: comece orquestrado. Migre para coreografado apenas se o orquestrador virar gargalo de acoplamento real (muitos times tendo que coordenar mudanças nele).
- **Backend-for-Frontend (BFF)**: quando diferentes clientes (mobile, web, parceiro externo) têm necessidades de agregação/formatação muito distintas do mesmo conjunto de serviços de domínio. Evita que a API de domínio vire um Frankenstein tentando servir a todos igualmente.

## Domain-Driven Design — aplicação prática

- **Bounded Context** é a fronteira nº1 a desenhar antes de qualquer código — mapeie os contextos de negócio (ex: Catálogo, Pedidos, Pagamento, Logística) e explicite onde a Ubiquitous Language de um contexto termina e a de outro começa (o mesmo termo, ex. "Cliente", pode significar coisas diferentes em Faturamento e em Suporte — isso é esperado e correto, não um bug de modelagem).
- **Context Mapping**: para cada par de bounded contexts que se comunicam, nomeie o padrão de relação (Partnership, Customer-Supplier, Conformist, Anticorruption Layer). Um **Anticorruption Layer** é obrigatório quando você integra com um sistema legado ou de terceiros cujo modelo de dados não deve "vazar" para o seu domínio.
- **Aggregate**: a fronteira de consistência transacional. Regra prática: um aggregate por transação; se uma operação de negócio parece precisar atualizar dois aggregates atomicamente, isso é sinal de que o desenho de aggregate está errado, ou de que a consistência entre eles deveria ser eventual (via evento), não transacional.
- Use DDD tático (Entities, Value Objects, Aggregates, Domain Events, Repositories) dentro de cada bounded context — mas não force a cerimônia completa em subdomínios simples/genéricos (ex: um módulo de CRUD de configuração não precisa de Aggregate Root com Domain Events).

## Protocolos de comunicação — framework de escolha

| Protocolo | Melhor para | Evitar quando |
|---|---|---|
| **REST (OpenAPI)** | APIs públicas, integrações com terceiros, CRUD simples, cacheável via HTTP | Comunicação interna de altíssima performance entre microsserviços (overhead de serialização JSON + parsing) |
| **gRPC (Protobuf)** | Comunicação interna serviço-a-serviço de alta performance, streaming bidirecional, contratos fortemente tipados | Consumo direto por browser sem gateway (suporte nativo limitado), ou quando o consumidor externo espera REST/JSON |
| **GraphQL** | Clientes que precisam agregar/consultar dados de forma flexível (mobile com necessidade de minimizar round-trips), BFF | APIs simples CRUD onde o overhead de resolver o schema não se paga; times sem maturidade para lidar com N+1 queries e cache de GraphQL |
| **WebSockets** | Comunicação bidirecional contínua, real-time (chat, colaboração), baixa latência | Casos onde atualização periódica simples resolve (prefira polling/SSE — menos estado para gerenciar) |
| **SSE (Server-Sent Events)** | Push unidirecional servidor→cliente (notificações, streaming de progresso/IA) | Necessidade de comunicação bidirecional real |
| **Webhooks** | Integração assíncrona com sistemas de terceiros, notificação de eventos entre organizações | Comunicação interna onde uma fila/tópico interno é mais confiável (webhooks exigem retry/idempotência do lado de quem recebe) |

## Documentando o modelo de dados na prática

Modelagem tática de DDD (Aggregate, Entity, Value Object) é o raciocínio conceitual — mas o time também precisa de um documento concreto listando entidades, campos e relacionamentos, que sobrevive independente de qual padrão arquitetural foi escolhido. Use `assets/templates/modelo-de-dados-template.md` para isso: tabela de entidades principais, detalhamento de campos por entidade, e tabelas de associação explícitas para toda relação N:N (nunca modele N:N como array/JSON — vira migração dolorosa na primeira query que precisar filtrar pelo lado "many"). Toda mudança estrutural relevante no modelo (não apenas adicionar um campo) merece tanto uma nota no próprio modelo de dados quanto um ADR — os dois juntos, não um no lugar do outro.

## Diagramação: C4 Model

Use os 4 níveis progressivamente — nem todo diagrama precisa descer até Componentes. Para uma visão ainda mais rápida (texto puro, sem depender de um renderizador Mermaid — útil em README, PR, ou chat), um diagrama de caixas em ASCII pode comunicar a arquitetura em camadas de forma mais imediata que C4; veja o exemplo em `assets/templates/stack-tecnologica-template.md`. Use ASCII para a visão instantânea de "quais camadas existem e como se conectam"; use C4/Mermaid quando o documento precisar detalhar relações de comunicação com mais precisão (protocolos, múltiplos serviços, contêineres).

1. **Contexto (Nível 1)**: o sistema como uma caixa única, seus usuários e os sistemas externos com que interage. Público-alvo: qualquer stakeholder, técnico ou não.
2. **Contêineres (Nível 2)**: quebra o sistema em suas aplicações/serviços/bancos de dados de alto nível e como se comunicam. Público-alvo: time técnico e arquitetos.
3. **Componentes (Nível 3)**: quebra um contêiner específico em seus componentes internos (controllers, serviços de domínio, repositórios). Use apenas para contêineres complexos que mereçam esse detalhamento — nem todo contêiner precisa.
4. **Código (Nível 4)**: geralmente substituído por diagramas de classe gerados por IDE quando necessário — raramente vale a manutenção manual.

Templates prontos em `assets/templates/c4-context.mmd`, `c4-container.mmd` e `c4-component.mmd` (Mermaid.js) — copie e adapte em vez de desenhar do zero.

## ADRs (Architecture Decision Records)

Toda decisão que seria cara de reverter (escolha de banco de dados, protocolo entre serviços, estratégia de multi-tenancy, escolha de linguagem para um novo serviço) merece um ADR. Regra prática: **se a resposta para "por que fizemos assim?" daqui a 1 ano vai exigir arqueologia de Slack/PR, deveria ter sido um ADR.**

Estrutura mínima (template completo em `assets/templates/adr-template.md`):
- **Status**: Proposto / Aceito / Substituído por ADR-XXX
- **Contexto**: qual problema/forças levaram a essa decisão precisar ser tomada
- **Decisão**: o que foi decidido, em uma frase clara
- **Consequências**: o que fica mais fácil e o que fica mais difícil por causa dessa decisão (sempre ambos — toda decisão tem custo)

ADRs são imutáveis uma vez aceitos: se a decisão muda, crie um novo ADR que referencia e substitui o anterior, em vez de editar o antigo — isso preserva o histórico de raciocínio.

## Antipadrões comuns

- **Distributed Monolith**: microsserviços que não podem ser deployados independentemente porque estão fortemente acoplados por contrato ou por transação síncrona em cadeia — tem toda a complexidade operacional de microsserviços e nenhum dos benefícios.
- **Anemic Domain Model**: entidades que são só sacos de getters/setters, com toda a lógica de negócio "vazada" para services genéricos — sintoma de não aplicar DDD tático de verdade.
- **Big Ball of Mud com nome de "Clean Architecture"**: aplicar os nomes das camadas (domain/application/infrastructure) sem realmente respeitar a direção de dependência (regra de que infra depende de domínio, nunca o contrário).
- **Saga sem compensação bem definida**: implementar o "caminho feliz" da saga e deixar as ações de compensação (rollback lógico) como "TODO" — isso vira o motivo de incidentes silenciosos de dados inconsistentes.
- **ADR depois do fato, reescrevendo a história**: documentar a decisão meses depois, já racionalizando o resultado, em vez de capturar o raciocínio e as alternativas consideradas no momento da decisão.
