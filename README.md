# Enterprise RAG Assistant

Retrieval-Augmented Generation (RAG) system for document intelligence and AI-powered question answering over organization-specific knowledge.

---

## Overview

Organizations store knowledge across documents, PDFs, wikis and tickets. Finding relevant information requires manual search across different sources.

This project implements a production-oriented RAG pipeline that grounds LLM responses in retrieved documentation — reducing hallucinations and keeping answers auditable via source attribution.

---

## Architecture

```
Documents (PDF / DOCX / TXT / Markdown / JSON)
          │
          ▼
  DocumentLoader — chunking with overlap
          │
          ▼
  Embeddings (OpenAI, batched)
          │
          ▼
  VectorStore (JsonVectorStore │ QdrantVectorStore)
          │
          ▼
  Hybrid Retrieval (BM25 + vector, configurable α)
          │
          ▼
  Relevance threshold filter
          │
          ▼
  Grounded answer + source attribution
          │
          ▼
  CLI / Web UI
```

**Storage backends:**

| Backend | Use case | Search |
|---|---|---|
| `JsonVectorStore` | Local dev, testing | O(n) brute-force |
| `QdrantVectorStore` | Production | HNSW index, O(log n) |

Switch via `VECTOR_STORE_TYPE=json|qdrant` env var — no code changes required.

---

## Features

- **Hybrid search** — BM25 keyword matching combined with dense vector similarity. Dense search handles semantic queries; BM25 handles exact-term matches (error codes, product names, technical jargon). Weighted combination configurable via `HYBRID_ALPHA`.
- **Relevance threshold** — queries scoring below `SIMILARITY_THRESHOLD` return no results rather than a hallucinated answer.
- **Source attribution** — every answer includes the source documents it was grounded in, visible in both CLI and Web UI.
- **Pluggable storage** — `VectorStore` abstract interface with JSON (dev) and Qdrant (production) implementations. Adding a new backend requires implementing 4 methods.
- **Evaluation framework** — `RAGEvaluator` measures Hit Rate, MRR and Keyword Precision against ground-truth test cases, without requiring LLM calls.
- **Batch embeddings** — chunks are embedded in batches, reducing API calls from O(n) to O(n/batchSize).
- **Retry with backoff** — exponential backoff on 429/5xx errors.
- **Structured logging** — JSON log output with level, timestamp and request metadata. Compatible with Datadog, CloudWatch, etc.
- **Document formats** — PDF, DOCX, TXT, Markdown, JSON.

---

## Quick Start

```bash
git clone https://github.com/hrso94/enterprise-rag-assistant.git
cd enterprise-rag-assistant
npm install
cp .env.example .env
# add OPENAI_API_KEY to .env
```

### CLI

```bash
npm start
```

### Web UI

```bash
cd web && npm install && npm run dev
# or from root:
npm run web:dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker

```bash
docker build -t rag-agent .
docker run --env-file .env --rm -p 3000:3000 rag-agent
```

### Production (Qdrant)

```bash
docker run -p 6333:6333 qdrant/qdrant

# .env
VECTOR_STORE_TYPE=qdrant
QDRANT_URL=http://localhost:6333
```

---

## Configuration

All parameters are configurable via environment variables — no source edits needed.

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Required |
| `CHAT_MODEL` | `gpt-4o-mini` | Chat completion model |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `RETRIEVAL_TOP_K` | `5` | Max chunks returned |
| `SIMILARITY_THRESHOLD` | `0.55` | Min vector score to include result |
| `HYBRID_ALPHA` | `0.7` | Vector weight (0=BM25 only, 1=vector only) |
| `CHUNK_SIZE` | `500` | Characters per chunk |
| `CHUNK_OVERLAP` | `100` | Overlap between adjacent chunks |
| `VECTOR_STORE_TYPE` | `json` | `json` or `qdrant` |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

See `.env.example` for the full list.

---

## Testing

```bash
npm test
```

30 tests covering:
- Document loading (format detection, size limits, error cases)
- Chunking (overlap verification, edge cases)
- Hybrid search (scoring, threshold, alpha weight, topK)
- RAGSystem (indexing, retrieval, structured response)
- RAGEvaluator (Hit Rate, MRR, Keyword Precision)

Tests run without an API key; API-dependent tests are skipped automatically in CI.

---

## Evaluation

```js
import { RAGEvaluator } from './lib/evaluator.js';

const evaluator = new RAGEvaluator(rag);
const report = await evaluator.evaluate([
  {
    query: 'How does authentication work?',
    expectedSources: ['auth-docs.md'],
    expectedKeywords: ['JWT', 'token'],
  },
]);
// { hitRate: 1, mrr: 1, keywordPrecision: 0.8, totalCases: 1 }
```

---

## Project Structure

```
enterprise-rag-assistant/
├── index.js                        # CLI entrypoint
├── test.js                         # Test suite (30 tests)
├── package.json
├── .env.example                    # All configuration options documented
├── lib/
│   ├── rag.js                      # RAGSystem — pipeline orchestration
│   ├── documentLoader.js           # Ingestion and chunking
│   ├── config.js                   # Centralized config with env var overrides
│   ├── logger.js                   # Structured JSON logger
│   ├── evaluator.js                # Retrieval quality metrics
│   ├── stores/
│   │   ├── VectorStore.js          # Abstract interface
│   │   ├── JsonVectorStore.js      # File-based (dev/test)
│   │   ├── QdrantVectorStore.js    # Production (HNSW index)
│   │   └── index.js                # Factory (VECTOR_STORE_TYPE)
│   ├── retrieval/
│   │   └── hybridSearch.js         # BM25 + vector combined scoring
│   └── connectors/
│       └── interface.js            # DataSource interface for enterprise connectors
├── web/                            # Next.js web UI with source attribution
└── data/
    └── vectors.json                # Local vector store (gitignored)
```

---

## Known Limitations and Roadmap

**Storage:** `JsonVectorStore` performs O(n) scan at query time and loads the full store into memory. Suitable for development and small corpora (<1k chunks). Use `QdrantVectorStore` for production.

**Retrieval:** No cross-encoder reranking. A reranking step after hybrid retrieval would improve precision for complex queries.

**Access control:** No per-document permission filtering. The `VectorStore` interface is designed to support metadata filtering (Qdrant payload filters) as a foundation for RBAC — not yet implemented.

**Connectors:** Jira, Confluence and SharePoint connector skeletons exist in `lib/connectors/` but are not implemented.

---

## License

MIT
