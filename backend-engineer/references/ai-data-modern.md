# IA Generativa, Dados Vetoriais & CDC — RAG, LLMOps, Streaming de Mudanças

## Sumário
1. [Bancos vetoriais](#vector-db)
2. [Arquitetura RAG resiliente](#rag)
3. [LLMOps — model serving e caching semântico](#llmops)
4. [Pipeline de ingestão de embeddings](#embedding-pipeline)
5. [Change Data Capture (CDC) com Debezium](#cdc)

---

## 1. Bancos vetoriais {#vector-db}

### Quando usar cada opção

| Cenário | Escolha | Por quê |
|---|---|---|
| Já usa PostgreSQL, escala moderada (<10M vetores) | **pgvector** | Sem infra nova, transacional junto com dados relacionais |
| Escala alta, latência sub-10ms, filtros complexos | **Qdrant** | Filtros por payload nativos, HNSW tunável, self-hosted |
| Zero operação, gerenciado, integra com LangChain/LlamaIndex | **Pinecone** | Serverless, sem cluster para gerenciar |
| Já usa Elasticsearch/OpenSearch para busca textual | **OpenSearch Vector (k-NN)** | Busca híbrida (texto + vetor) no mesmo cluster |

### pgvector — setup e query

```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB,
    embedding VECTOR(1536),  -- dimensão do modelo (ex: text-embedding-3-small)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice HNSW — melhor trade-off recall/latência para produção
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Busca por similaridade com filtro de metadata (busca híbrida)
SELECT id, content, metadata, 1 - (embedding <=> $1) AS similarity
FROM documents
WHERE metadata->>'tenant_id' = $2
ORDER BY embedding <=> $1
LIMIT 10;
```

```typescript
// Runtime tuning: ef_search afeta recall vs latência por query
await db.query(`SET hnsw.ef_search = 100`); // maior = mais recall, mais lento

async function searchSimilar(queryEmbedding: number[], tenantId: string, limit = 10) {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    return db.query(`
        SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
        FROM documents
        WHERE metadata->>'tenant_id' = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
    `, [vectorLiteral, tenantId, limit]);
}
```

### Qdrant — client e filtros

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });

await qdrant.createCollection('documents', {
    vectors: { size: 1536, distance: 'Cosine' },
    hnsw_config: { m: 16, ef_construct: 100 },
});

// Busca com filtro de payload (equivalente a WHERE)
const results = await qdrant.search('documents', {
    vector: queryEmbedding,
    filter: {
        must: [
            { key: 'tenant_id', match: { value: tenantId } },
            { key: 'published', match: { value: true } },
        ],
    },
    limit: 10,
    score_threshold: 0.7, // descarta resultados irrelevantes
});
```

### Pinecone — client e filtros (fully managed, zero infraestrutura)

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// Índice é provisionado uma vez (via console/API), não a cada deploy
const index = pinecone.index('documents');

// Upsert em batch — Pinecone cobra por operação, batch reduz custo e latência
await index.namespace(tenantId).upsert([
    {
        id: chunkId,
        values: embedding,
        metadata: { text: chunkText, source: documentId, publishedAt: Date.now() },
    },
]);

// Busca com filtro de metadata — sintaxe similar a MongoDB
const results = await index.namespace(tenantId).query({
    vector: queryEmbedding,
    topK: 10,
    filter: { published: { $eq: true } },
    includeMetadata: true,
});

// Namespace = isolamento nativo por tenant — cada tenant tem seu próprio
// espaço de vetores dentro do MESMO índice, sem custo de índice separado por tenant
```

```
Ponto de atenção operacional: Pinecone não tem "schema" — um erro de nome de
campo no filtro (ex: `publishd` em vez de `published`) simplesmente retorna zero
resultados, sem erro. Valide os nomes de metadata na camada de aplicação antes
de montar o filtro, já que o serviço não vai avisar sobre o typo.
```

### OpenSearch Vector (k-NN) — busca híbrida texto + vetor no mesmo cluster

```json
// Mapeamento do índice — campo vetorial ao lado de campos de texto tradicionais
PUT /documents
{
  "settings": { "index.knn": true },
  "mappings": {
    "properties": {
      "text": { "type": "text" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": { "name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib" }
      },
      "tenant_id": { "type": "keyword" },
      "published_at": { "type": "date" }
    }
  }
}
```

```typescript
import { Client } from '@opensearch-project/opensearch';

const client = new Client({ node: process.env.OPENSEARCH_URL });

// Busca HÍBRIDA — combina relevância textual (BM25) com similaridade vetorial
// no MESMO request, útil quando nem toda pergunta se beneficia igualmente de cada modo
async function hybridSearch(queryText: string, queryEmbedding: number[], tenantId: string) {
    const result = await client.search({
        index: 'documents',
        body: {
            query: {
                bool: {
                    should: [
                        { match: { text: { query: queryText, boost: 0.3 } } }, // peso da busca textual
                        {
                            knn: {
                                embedding: { vector: queryEmbedding, k: 10, boost: 0.7 }, // peso da busca vetorial
                            },
                        },
                    ],
                    filter: [{ term: { tenant_id: tenantId } }],
                },
            },
            size: 10,
        },
    });
    return result.body.hits.hits;
}
```

**Quando a busca híbrida (OpenSearch) vence a busca puramente vetorial:** perguntas com termos exatos que importam (nome de produto, código de erro, SKU) se beneficiam do componente textual (BM25) além da similaridade semântica — busca puramente vetorial às vezes "entende o sentido" mas erra um termo técnico exato que o usuário digitou literalmente.

---

## 2. Arquitetura RAG resiliente {#rag}

```
Fluxo RAG em produção (com fallbacks):

Pergunta do usuário
      │
      ▼
┌─────────────────┐     cache hit?     ┌──────────────────┐
│ Cache semântico  │───────────────────▶│ Retorna resposta  │
│ (ver seção 3)    │                    │ cacheada          │
└─────────────────┘                    └──────────────────┘
      │ miss
      ▼
┌─────────────────┐
│ Gerar embedding  │  ← timeout curto (2-3s) + retry
│ da query         │
└─────────────────┘
      │
      ▼
┌─────────────────┐     falha?         ┌──────────────────┐
│ Busca vetorial   │───────────────────▶│ Fallback: busca   │
│ (top-K)          │                    │ textual (BM25)    │
└─────────────────┘                    └──────────────────┘
      │
      ▼
┌─────────────────┐
│ Re-rank (opcional)│  ← cross-encoder para precisão maior
└─────────────────┘
      │
      ▼
┌─────────────────┐     falha/timeout   ┌──────────────────┐
│ LLM com contexto │────────────────────▶│ Resposta genérica │
│ (streaming)      │                     │ + log para revisão│
└─────────────────┘                     └──────────────────┘
```

```typescript
class RagPipeline {
    constructor(
        private readonly vectorStore: VectorStore,
        private readonly llm: LlmClient,
        private readonly semanticCache: SemanticCache,
        private readonly fallbackSearch: TextSearchClient,
    ) {}

    async answer(query: string, tenantId: string): Promise<RagResponse> {
        // 1. Cache semântico primeiro (evita custo de LLM)
        const cached = await this.semanticCache.get(query, tenantId);
        if (cached) return { ...cached, source: 'cache' };

        // 2. Retrieval com fallback
        let context: Document[];
        try {
            context = await withTimeout(
                this.vectorStore.search(query, tenantId, { limit: 8 }),
                3_000
            );
        } catch (err) {
            logger.warn('Busca vetorial falhou, usando fallback textual', { err });
            context = await this.fallbackSearch.search(query, tenantId);
        }

        if (context.length === 0) {
            return { answer: 'Não encontrei informação suficiente para responder.', source: 'no_context' };
        }

        // 3. Grounding explícito — reduz alucinação
        const prompt = this.buildGroundedPrompt(query, context);

        // 4. Geração com circuit breaker (reutiliza padrão de architecture-patterns.md)
        const answer = await this.llm.generateWithCircuitBreaker(prompt);

        // 5. Persistir no cache semântico
        await this.semanticCache.set(query, tenantId, { answer, context });

        return { answer, source: 'generated', citedDocs: context.map(c => c.id) };
    }

    private buildGroundedPrompt(query: string, context: Document[]): string {
        return `Responda SOMENTE com base no contexto abaixo. Se a resposta não estiver no contexto, diga que não sabe.

Contexto:
${context.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}

Pergunta: ${query}`;
    }
}
```

### Checklist de robustez para RAG em produção
- [ ] Timeout curto em cada etapa (embedding, busca, geração)
- [ ] Fallback de busca textual (BM25/Elasticsearch) se o vetorial falhar
- [ ] Prompt com grounding explícito ("responda só com base no contexto")
- [ ] Citação das fontes na resposta (rastreabilidade)
- [ ] Cache semântico para queries repetidas (custo e latência)
- [ ] Guardrails de saída (filtro de conteúdo antes de retornar ao usuário)
- [ ] Log de queries sem contexto suficiente (identifica gaps na base de conhecimento)

---

## 3. LLMOps — model serving e caching semântico {#llmops}

### Model serving — self-hosted vs API gerenciada

| Cenário | Escolha |
|---|---|
| Baixo volume, sem time de ML dedicado | API gerenciada (Anthropic, OpenAI) |
| Alto volume, dados sensíveis, custo por token alto | Self-hosted (vLLM, TGI) atrás de gateway |
| Necessidade de fine-tuning específico do domínio | Self-hosted com modelo open-weight (Llama, Mistral) |

```typescript
// Gateway de LLM — abstrai provider, permite fallback multi-provider
class LlmGateway {
    private providers: LlmProvider[];

    constructor(providers: LlmProvider[]) {
        this.providers = providers; // ordenados por prioridade/custo
    }

    async generateWithCircuitBreaker(prompt: string): Promise<string> {
        for (const provider of this.providers) {
            try {
                return await provider.circuitBreaker.call(() => provider.generate(prompt));
            } catch (err) {
                logger.warn(`Provider ${provider.name} falhou, tentando próximo`, { err });
                continue;
            }
        }
        throw new Error('Todos os providers de LLM falharam');
    }
}
```

### Cache semântico — evita chamadas repetidas ao LLM

```typescript
class SemanticCache {
    constructor(
        private readonly vectorStore: VectorStore,
        private readonly similarityThreshold = 0.95, // alto: só cacheia queries MUITO parecidas
    ) {}

    async get(query: string, tenantId: string): Promise<CachedAnswer | null> {
        const embedding = await this.embed(query);
        const results = await this.vectorStore.search(embedding, tenantId, { limit: 1 });

        if (results.length === 0 || results[0].similarity < this.similarityThreshold) {
            return null;
        }
        return results[0].metadata.answer;
    }

    async set(query: string, tenantId: string, answer: CachedAnswer): Promise<void> {
        const embedding = await this.embed(query);
        await this.vectorStore.upsert({
            embedding,
            metadata: { tenantId, answer, cachedAt: new Date().toISOString() },
        });
    }
}
```

### Observabilidade específica de LLM
- Rastrear: tokens de entrada/saída, latência de time-to-first-token, custo por request
- Logar prompt + resposta (com PII mascarado) para auditoria de qualidade
- Métrica de "taxa de fallback" (quantas vezes o provider primário falhou)
- Alertar sobre picos de latência de geração (P95 > SLA)

---

## 4. Pipeline de ingestão de embeddings {#embedding-pipeline}

```typescript
// Pipeline de ingestão — chunking, embedding, upsert idempotente
class EmbeddingIngestionPipeline {
    async ingest(document: RawDocument): Promise<void> {
        // 1. Chunking — nunca embeddar documentos inteiros
        const chunks = this.chunkText(document.content, {
            maxTokens: 512,
            overlapTokens: 50, // overlap preserva contexto entre chunks
        });

        // 2. Embedding em batch (mais barato que 1 por 1)
        const embeddings = await this.batchEmbed(chunks.map(c => c.text));

        // 3. Upsert idempotente — hash do conteúdo como parte do ID
        for (const [chunk, embedding] of zip(chunks, embeddings)) {
            const chunkId = hashContent(document.id, chunk.text);
            await this.vectorStore.upsert({
                id: chunkId,
                embedding,
                metadata: {
                    documentId: document.id,
                    tenantId: document.tenantId,
                    chunkIndex: chunk.index,
                    text: chunk.text,
                    updatedAt: new Date().toISOString(),
                },
            });
        }

        // 4. Remover chunks órfãos (documento foi editado e ficou menor)
        await this.pruneOrphanChunks(document.id, chunks.length);
    }

    private chunkText(text: string, opts: { maxTokens: number; overlapTokens: number }): Chunk[] {
        // Estratégia recomendada: split por sentença/parágrafo, respeitando limite de tokens
        // Bibliotecas: langchain TextSplitter, llama-index NodeParser
        // ... implementação de chunking semântico
        return [];
    }
}
```

### Checklist de pipeline de ingestão
- [ ] Chunking com overlap (evita perder contexto na fronteira do chunk)
- [ ] Batch de embedding (reduz custo e latência vs. chamada individual)
- [ ] Upsert idempotente (reprocessar o mesmo documento não duplica vetores)
- [ ] Limpeza de chunks órfãos quando documento é editado/removido
- [ ] Versionamento de embedding model (trocar de modelo exige reprocessar tudo)

---

## 5. Change Data Capture (CDC) com Debezium {#cdc}

### Quando usar CDC vs. outbox pattern

```
Outbox pattern (já coberto em architecture-patterns.md):
✅ Você controla o código da aplicação
✅ Poucos serviços consumindo o mesmo evento
✅ Simplicidade > desempenho máximo

CDC (Debezium):
✅ Banco legado sem possibilidade de alterar código
✅ Múltiplos consumidores heterogêneos (data lake, search index, cache)
✅ Precisa capturar TODAS as mudanças, inclusive de processos batch/manuais
✅ Migração de monolito: sincronizar dados sem tocar no código legado
```

### Configuração — Debezium + PostgreSQL + Kafka

```json
// debezium-connector-config.json
{
  "name": "orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${file:/secrets/db-password.txt}",
    "database.dbname": "orders_db",
    "topic.prefix": "orders",
    "table.include.list": "public.orders,public.order_items",
    "plugin.name": "pgoutput",
    "publication.autocreate.mode": "filtered",
    "snapshot.mode": "initial",
    "tombstones.on.delete": "true",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false"
  }
}
```

```sql
-- Pré-requisito no PostgreSQL: replicação lógica
ALTER SYSTEM SET wal_level = 'logical';
-- Requer restart do banco

-- Usuário com permissão de replicação
CREATE ROLE debezium WITH REPLICATION LOGIN PASSWORD 'secret';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;
```

### Consumidor de eventos CDC — idempotente

```typescript
class CdcEventConsumer {
    async processChange(event: DebeziumEvent): Promise<void> {
        const { op, before, after, source } = event; // op: 'c'=create, 'u'=update, 'd'=delete

        // Idempotência: usar LSN (log sequence number) do source como chave
        const eventKey = `${source.table}:${source.lsn}`;
        if (await this.alreadyProcessed(eventKey)) return;

        switch (op) {
            case 'c':
            case 'u':
                await this.syncToSearchIndex(after);
                break;
            case 'd':
                await this.removeFromSearchIndex(before.id);
                break;
        }

        await this.markProcessed(eventKey);
    }
}
```

### Cuidados operacionais
- [ ] Monitorar lag de replicação (slot de replicação crescendo = risco de disco cheio no banco fonte)
- [ ] Definir política de retenção do slot (slot órfão trava o WAL do PostgreSQL indefinidamente)
- [ ] Schema evolution: usar Schema Registry (ver `api-design.md`) para eventos CDC também
- [ ] Snapshot inicial em tabelas grandes — planejar janela de baixo tráfego
