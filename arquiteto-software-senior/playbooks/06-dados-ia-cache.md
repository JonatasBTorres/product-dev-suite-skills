# Playbook 06 — Engenharia de Dados, IA & Cache

## Escopo

Escolha e tuning de bancos de dados, Change Data Capture e streaming, arquiteturas de RAG/LLMOps, e padrões de cache distribuído. Use este playbook para perguntas sobre modelagem de dados, escolha entre SQL/NoSQL/vetorial, pipelines de IA generativa, ou estratégias de cache.

> **Nota de calibração (ver Tiers no `SKILL.md`):** para RAG em Tier 0-1 (corpus pequeno, poucos usuários), `pgvector` sobre o Postgres que você já tem quase sempre resolve — só migre para Qdrant/Pinecone dedicado quando volume ou latência realmente exigirem (tipicamente Tier 2+). CDC com Debezium só se paga quando há de fato múltiplos sistemas consumindo a mesma mudança de dado; para um único consumidor, publicar o evento diretamente na aplicação é mais simples e igualmente correto.

## Bancos de dados — framework de escolha

### Relacional vs. NoSQL

| Precisa de... | Escolha |
|---|---|
| Transações ACID multi-tabela, relacionamentos complexos, consultas ad-hoc flexíveis | **Relacional** (Postgres/MySQL) — o padrão a mirar por default; NoSQL deveria ser uma escolha deliberada, não o ponto de partida |
| Escala horizontal massiva de leitura/escrita com acesso previsível por chave | **NoSQL Key-Value/Documento** (DynamoDB/Firestore/MongoDB) — desenhe o *access pattern* primeiro, o schema depois (o oposto do relacional) |
| Séries temporais / analítico de altíssimo volume de colunas esparsas | **Wide-Column** (Bigtable/Cassandra) |
| Busca por similaridade semântica (embeddings) | **Banco vetorial** (ver seção RAG abaixo) |

### Tuning de bancos relacionais — checklist

- [ ] Índices cobrem as queries reais do `EXPLAIN ANALYZE`, não "índice em toda coluna por precaução" (índices têm custo de escrita e espaço)
- [ ] `VACUUM`/autovacuum ajustado para tabelas de alto churn — bloat de tabela não tratado degrada performance silenciosamente ao longo de meses
- [ ] Nível de isolamento de transação escolhido deliberadamente (`READ COMMITTED` como padrão seguro; `SERIALIZABLE` só onde anomalias de concorrência são inaceitáveis, com plano para lidar com falhas de serialização/retry)
- [ ] Locks de longa duração identificados e evitados (transações que fazem chamada de rede/IO enquanto seguram um lock são a causa nº1 de contenção inesperada)
- [ ] Connection pooling configurado (PgBouncer/RDS Proxy) — conexões diretas de cada instância de aplicação esgotam o limite do banco rapidamente sob escala

## Change Data Capture & Streaming

- **Debezium (CDC)**: captura mudanças do log de transação do banco (WAL do Postgres, binlog do MySQL) e publica como eventos — permite sincronizar dados para outros sistemas (cache, busca, data warehouse, outro serviço) sem acoplar a aplicação a publicar eventos manualmente em cada write. Combina naturalmente com o Outbox Pattern (playbook 03): a tabela outbox é capturada via CDC e publicada no tópico.
- **Kafka vs. RabbitMQ vs. NATS**:
  - **Kafka**: log de eventos duráveis e replayable, alto throughput, múltiplos consumidores independentes lendo no seu próprio ritmo. Escolha quando eventos precisam ser retidos/reprocessados (auditoria, event sourcing, múltiplos consumidores desacoplados no tempo).
  - **RabbitMQ**: modelo de fila tradicional (mensagem é removida ao ser consumida), roteamento flexível (exchanges), ótimo para filas de trabalho e RPC assíncrono. Escolha quando o padrão é "processar e remover", não "reter histórico".
  - **NATS**: extremamente leve e de baixa latência, bom para comunicação interna de altíssima performance e padrões pub/sub simples; NATS JetStream adiciona persistência quando necessário.

## Arquiteturas de RAG e LLMOps

### Escolha de banco vetorial

| Cenário | Escolha |
|---|---|
| Já usa Postgres, volume moderado (até alguns milhões de vetores), quer evitar mais um sistema para operar | **pgvector** — menor custo operacional, aproveitando infraestrutura/backup/observabilidade já existente |
| Escala grande, necessidade de filtros complexos combinados com busca vetorial, latência muito baixa como requisito central | **Qdrant** (self-hosted ou managed) ou **Pinecone** (fully managed) |
| Já opera stack de busca full-text (Elasticsearch/OpenSearch) e quer busca híbrida (texto + vetor) no mesmo sistema | **OpenSearch Vector** |

### Padrão de arquitetura RAG resiliente

1. **Ingestão**: pipeline de chunking (tamanho de chunk deliberado, não arbitrário — depende do modelo de embedding e do tipo de conteúdo) → geração de embedding → upsert no banco vetorial, com metadados suficientes para filtro (fonte, data, permissões de acesso).
2. **Controle de acesso no momento da consulta**: se o corpus tem documentos com permissões diferentes por usuário/tenant, o filtro de permissão deve ser aplicado na própria query vetorial (metadata filter), nunca só depois de recuperar os resultados — caso contrário há vazamento de informação através do que o modelo "viu" mesmo que não cite a fonte diretamente.
3. **Resiliência**: trate o banco vetorial e o serviço de embedding como dependências externas comuns — aplique os padrões do playbook 07 (timeout, circuit breaker, fallback). Um fallback razoável para indisponibilidade do RAG é responder com uma resposta genérica/sem contexto adicional em vez de falhar a interação inteira, dependendo do produto.
4. **Caching semântico**: cache de respostas para queries semanticamente similares (não apenas idênticas) reduz custo e latência em cargas com perguntas repetidas/parecidas — mas exige cuidado com staleness quando o corpus muda com frequência.
5. **Observabilidade específica de LLM**: logue não só latência/erro, mas também: chunks recuperados por query (para debugar relevância), tokens consumidos (custo), e taxa de "não sei responder" — são os sinais que indicam se o pipeline de RAG está de fato funcionando, não só "não deu erro 500".
6. **Model serving**: para modelos auto-hospedados, separe a camada de serving (batching de requisições, autoscaling por GPU) da lógica de aplicação — não acople o código de negócio ao runtime específico do modelo, para poder trocar de modelo/provider sem reescrever a aplicação.

## Cache & Performance

### Estratégias de cache — framework de escolha

| Estratégia | Como funciona | Trade-off |
|---|---|---|
| **Cache-aside** (lazy loading) | Aplicação verifica cache; se ausente, lê do banco e popula o cache | Mais simples e mais usado; primeira leitura após miss é mais lenta; risco de cache stampede (ver abaixo) |
| **Write-through** | Toda escrita vai para o cache e o banco simultaneamente | Cache sempre consistente com o banco; escrita um pouco mais lenta (duas operações) |
| **Write-behind** (write-back) | Escrita vai só para o cache, que persiste no banco de forma assíncrona/batch | Escrita muito rápida; risco de perda de dados se o cache falhar antes de persistir — só aceitável quando esse risco é tolerável pelo negócio |

### Mitigação de Cache Stampede

Quando uma chave popular expira e centenas de requisições simultâneas tentam recalculá-la ao mesmo tempo, sobrecarregando o banco:

- **Lock/mutex distribuído**: só uma requisição recalcula o valor; as demais aguardam ou servem o valor antigo (stale-while-revalidate).
- **Expiração antecipada probabilística** (early recomputation): recalcule a chave um pouco antes do TTL expirar de fato, escalonado probabilisticamente entre requisições, para nunca haver um "penhasco" de expiração simultânea.
- **TTL com jitter**: nunca defina o mesmo TTL exato para chaves relacionadas criadas em lote — adicione um jitter aleatório para espalhar as expirações no tempo.

### Estratégias de invalidação

- Prefira invalidação explícita (evento de mudança dispara invalidação da chave específica) a depender só de TTL curto quando a correção do dado importa.
- Para dados que raramente mudam mas cuja consistência importa quando mudam, combine TTL longo + invalidação explícita via evento (CDC/Outbox) — o melhor dos dois mundos.

## Antipadrões comuns

- Escolher NoSQL "porque escala melhor" sem ter desenhado o access pattern — geralmente resulta em modelagem que não aproveita as vantagens do NoSQL e perde as vantagens do relacional.
- RAG sem filtro de permissão na própria busca vetorial — vazamento de dados entre usuários/tenants através do contexto recuperado.
- Cache sem estratégia de invalidação, só TTL curto "para não desatualizar" — sobrecarrega o banco com recomputações frequentes desnecessárias.
- CDC ligado diretamente à tabela de negócio sem Outbox Pattern — mistura eventos de infraestrutura (toda mudança de linha) com eventos de domínio (fatos de negócio), tornando os consumidores acoplados a detalhes de schema interno.
