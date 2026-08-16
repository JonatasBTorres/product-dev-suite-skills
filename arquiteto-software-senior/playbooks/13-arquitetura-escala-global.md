# Playbook 13 — Arquitetura para Escala Global

## Escopo

Preocupações arquiteturais específicas de servir usuários verdadeiramente globais: soberania/residência de dados, edge computing, implicações arquiteturais de i18n/l10n, e operação de times distribuídos por fuso horário. Use este playbook para "como desenho para usuários no mundo todo" ou "preciso guardar dado de usuário europeu na Europa" — distinto de disaster recovery multi-região (playbook 07), que resolve um problema diferente.

> **Nota de calibração (ver Tiers no `SKILL.md`):** este playbook é essencialmente Tier 3 por definição — a maioria dos sistemas (Tier 0-2) não deveria investir nisso ainda. A armadilha mais comum é um time Tier 1 tentando desenhar para "escala global" antecipadamente e pagando o custo de complexidade sem ter, de fato, usuários fora da região de origem que justifiquem o investimento. Resista à tentação de resolver isso "por precaução" — resolva quando o primeiro cliente/mercado real exigir.

## Data residency e soberania de dados — diferente de disaster recovery

Multi-região para disaster recovery (playbook 07) busca **redundância**: o dado existe em mais de um lugar para sobreviver a uma falha regional. Data residency busca o oposto em certos casos: **restrição de localização** — a lei pode exigir que o dado de um cidadão/residente de um país específico nunca resida fisicamente fora daquela jurisdição, o que pode até estar em tensão com uma estratégia de replicação ampla motivada por DR.

- **GDPR (UE)**: não proíbe a transferência internacional de dados por si só, mas exige um mecanismo legal válido para isso (Cláusulas Contratuais Padrão/SCCs, decisão de adequação) — pós-decisão *Schrems II*, transferências para certas jurisdições (notadamente EUA, sem um novo framework de adequação) exigem salvaguardas adicionais.
- **Leis de localização estrita** (ex: China com a PIPL, Rússia, e regulações setoriais em vários países do Oriente Médio e América Latina) podem exigir que o dado **fisicamente** nunca saia do território — não basta criptografia ou controle de acesso, a localização física do armazenamento é o requisito.
- **Implicação arquitetural concreta**: se há requisito real de residência, o modelo de dados precisa ser desenhado com particionamento por região desde o início (region-scoped data model) — isso é uma decisão estrutural de dia 1, não um retrofit que se faz depois de o sistema já estar em produção com dados espalhados.

### Framework de decisão: como estruturar dados para múltiplas jurisdições

| Modelo | Como funciona | Quando usar |
|---|---|---|
| **Replicação global de tudo** | Todo dado replica para todas as regiões | Mais simples operacionalmente, mas pode violar requisitos de residência — só apropriado quando não há requisito legal de localização (ou quando o dado em questão é genuinamente não-sensível) |
| **Particionamento por região com roteamento de aplicação** | O dado do usuário reside fisicamente na região correspondente à sua jurisdição; a aplicação roteia cada usuário para a região onde seu dado vive | Modelo dominante para SaaS B2B com clientes em múltiplas jurisdições com exigência de residência — mais complexo de operar, mas é o que de fato atende o requisito legal |
| **Híbrido** | Dado sensível/regulado fica particionado por região; dado não-sensível (ex: catálogo de produto, configuração global) replica livremente | Equilíbrio prático mais comum — nem todo dado do sistema tem o mesmo requisito de residência |

## Edge Computing

- **O que é**: execução de lógica de aplicação (não apenas cache de conteúdo estático) na borda da rede, fisicamente próxima ao usuário — Cloudflare Workers, Lambda@Edge/CloudFront Functions, Fastly Compute.
- **Diferença de CDN tradicional**: um CDN puro serve conteúdo estático cacheado; edge compute executa código a cada requisição (verificação de autenticação leve, personalização, roteamento de A/B test, transformação de resposta) sem precisar ir e voltar até a região "home" da aplicação.
- **Quando vale a pena**: apenas para operações genuinamente sensíveis à latência de borda (dezenas de milissegundos importam) e que sejam stateless/idempotentes o suficiente para caber no runtime restrito da borda (tipicamente sem acesso ao ecossistema completo de bibliotecas do runtime normal, com limites de tempo de execução curtos).
- **O que não é**: edge compute não substitui uma arquitetura multi-região completa para toda a aplicação — é uma otimização pontual para operações específicas de baixa latência, não uma estratégia de arquitetura geral.

## Implicações arquiteturais de i18n/l10n

Internacionalização vai além de "traduzir strings" — tem implicações reais de modelagem de dados:

- **Separação de conteúdo e código desde o início**: nenhuma string de interface hardcoded no código-fonte — mesmo que o produto hoje só tenha um idioma, retrofit de i18n depois é significativamente mais caro que desenhar para isso desde o início.
- **Collation/ordenação alfabética depende de locale**: a ordem "correta" de ordenação de strings varia por idioma/região — um `ORDER BY` ingênuo pode produzir uma ordenação que faz sentido em um locale e não em outro.
- **RTL (right-to-left)**: idiomas como árabe e hebraico invertem a direção do layout — isso é uma implicação estrutural de design de UI, não apenas uma configuração de fonte/texto, e precisa ser considerada na arquitetura do frontend desde cedo se esses mercados são um alvo real.
- **Formato de endereço e nome não é universal**: nem todo país tem "estado"/"CEP" no mesmo formato dos EUA ou do Brasil; nomes têm convenções diferentes de ordem e composição entre culturas — um modelo de dados de endereço/nome rígido demais (campos fixos assumindo um único formato) quebra silenciosamente para uma fração real de usuários globais.

## Moeda e fuso horário

- **Preço multi-moeda**: decida explicitamente se o preço "canônico" por mercado é fixo por moeda (mais previsível para o negócio e para o cliente, mas exige gestão manual de tabela de preços) ou convertido dinamicamente por taxa de câmbio (mais simples de manter, mas sujeito a variação cambial que pode surpreender o cliente ou corroer margem).
- **Timestamps sempre em UTC no armazenamento**, convertidos para o fuso local apenas na camada de apresentação — armazenar em fuso local "porque é mais fácil de ler no banco" é a origem clássica de bugs de horário de verão e de comparação incorreta entre eventos de fusos diferentes.

## Operação Follow-the-Sun

Quando o time de engenharia está genuinamente distribuído por múltiplos fusos horários, o modelo de on-call pode ser desenhado para que sempre exista alguém acordado no fuso "ativo" no momento, em vez de sempre acordar a mesma pessoa/região às 3h locais. Isso é tanto uma decisão de Team Topologies (playbook 09 — como os times são organizados) quanto de infraestrutura/observabilidade (playbook 10 — runbooks claros o suficiente para que qualquer plantonista, em qualquer fuso, consiga agir sem depender do conhecimento tácito de uma única pessoa).

## Antipadrões comuns

- **Assumir que multi-região para DR (playbook 07) já resolve data residency** — são requisitos diferentes e às vezes conflitantes: DR quer redundância ampla, residency quer restrição de localização.
- **Tratar i18n como tarefa de tradução de string no fim do projeto** — ignora as implicações reais de modelagem de dado (endereço, nome, ordenação, RTL) que são caras de corrigir depois.
- **Desenhar para "escala global" sem ter, de fato, usuários fora da região de origem ainda** — importa toda a complexidade (particionamento regional, edge compute, i18n completo) sem o requisito de negócio real que a justificaria, tirando foco e velocidade de onde o produto realmente precisa nesse estágio.
- **Timestamp armazenado em horário local "porque é mais fácil de ler"** — gera bugs sutis e difíceis de depurar relacionados a horário de verão e comparação entre fusos.
- **Preço convertido dinamicamente sem nenhum controle de variação cambial**, expondo o negócio (ou o cliente) a oscilações de câmbio não intencionais.
