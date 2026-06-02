# Enterprise RAG Assistant

Retrieval-Augmented Generation (RAG) system for document intelligence, knowledge discovery and AI-powered question answering.

---

## Problem

Organizations store knowledge across multiple systems and documents.
Finding relevant information often requires manually searching through documentation, PDFs, tickets and knowledge bases.

This project explores how Retrieval-Augmented Generation (RAG) can be used to create a grounded AI assistant capable of answering questions using organization-specific knowledge.

---

## Design Goals

- Ground responses using retrieved documentation
- Reduce hallucinations through a retrieval-first architecture
- Keep infrastructure simple and provider-agnostic
- Support future enterprise integrations
- Enable migration from local storage to production vector databases

---

## Current Status

**Implemented:**

- Document ingestion (TXT, Markdown, JSON, PDF, DOCX)
- Chunking
- Embeddings
- Local vector storage
- Semantic retrieval
- OpenAI-based grounded answer generation
- Docker support
- Minimal Web UI with conversation history

**Planned:**

- Hybrid search
- Reranking
- Evaluation framework
- Permission-aware retrieval
- SharePoint connector
- Confluence connector
- Jira connector
- Provider abstraction for multi-LLM support

---

## Quick Start

```bash
git clone https://github.com/hrso94/enterprise-rag-assistant.git
cd enterprise-rag-assistant
npm install
cp .env.example .env
# add OPENAI_API_KEY to .env
```

### Run CLI

```bash
npm start
```

### Run Web UI

```bash
npm run web:dev
```

### Docker

```bash
docker build -t rag-agent .
docker run --env-file .env --rm -p 3000:3000 rag-agent
```

---

## Features

- Document upload and ingestion
- Semantic retrieval over organization-specific content
- Grounded answer generation using retrieved context
- Conversation history in the Web UI
- Local connector pattern for enterprise sources
- Mocked Jira / Confluence connector skeletons
- Docker-ready deployment

---

## Architecture

```
  Documents (PDF / DOCX / TXT / Markdown / JSON)
            |
            v
   Ingestion Pipeline (chunking, embeddings)
            |
            v
       Local Vector DB
            |
            v
      Semantic Retrieval
            |
            v
       Grounded Answer
            |
            v
     User interface (CLI / Web)
```

---

## Enterprise Integrations (architecture-ready)

This repository is built with a pluggable connector pattern and explicit enterprise integration readiness.

- `lib/connectors/interface.js` defines a `DataSource` interface: `getDocuments(): Promise<Document[]>`
- `LocalFilesSource` provides a working local ingestion example
- `MockJiraSource` and `MockConfluenceSource` are intentionally lightweight skeletons

The current code avoids sharing proprietary integration logic while demonstrating how enterprise sources should be integrated.

In production, connectors should implement:

- OAuth or PAT authentication
- pagination and rate limit handling
- permission-aware retrieval
- incremental sync and delta ingestion
- source citations for traceability

---

## Known Limitations

- No access-control layer implemented yet
- Retrieval quality depends on chunking strategy
- Local JSON storage is not suitable for large datasets
- No evaluation pipeline currently implemented

---

## Future Enterprise Features

- Jira ingestion
- Confluence ingestion
- SharePoint ingestion
- Permission-aware retrieval
- Role-based access control
- Source citations
- Hybrid search (BM25 + vector search)
- Reranking
- LLM provider abstraction

---

## AI Engineering Considerations

This project intentionally focuses on:

- Hallucination reduction
- Context optimization
- Retrieval quality
- Token cost optimization
- Provider-agnostic architecture
- Future enterprise integrations

---

## How it works

1. **Document ingestion** – ingest files and text content
2. **Chunking** – split documents into manageable segments
3. **Embeddings** – convert text to vectors with OpenAI embeddings
4. **Vector search** – retrieve relevant chunks using cosine similarity
5. **Grounded answer** – prompt OpenAI with retrieved context and user question

---

## Project Structure

```
ai_agent/
├── index.js                 # CLI entrypoint
├── test.js                  # Test harness
├── package.json             # Dependencies and scripts
├── .env.example             # Example environment variables
├── .gitignore               # Ignore configuration
├── lib/
│   ├── rag.js               # RAG pipeline and search logic
│   ├── documentLoader.js    # Document ingestion and parsing
│   └── connectors/          # Connector skeletons for enterprise sources
├── web/                     # Minimal Next.js web UI
├── data/
│   └── vectors.json         # Local vector store (generated)
└── test_doc.md              # Sample test document
```

---

## Configuration

### Change top-K retrieval

Edit `lib/rag.js`:

```js
async retrieveRelevantChunks(query, topK = 3) {
```

### Change model

Edit `lib/rag.js`:

```js
this.chatModel = "gpt-3.5-turbo";
```

### Tune chunk size

Edit `lib/documentLoader.js`:

```js
chunkDocument(content, chunkSize = 500, chunkOverlap = 100) {
```

---

## Testing

Run the test harness:

```bash
node test.js
```

The test will:

- load `test_doc.md`
- process the document
- generate embeddings
- validate retrieval and response generation

---

## Security

⚠️ Do not commit `.env` or any secret keys.

```bash
git check-ignore .env
```

---

## Cost Considerations

OpenAI charges for:

- Embeddings: `text-embedding-3-small`
- Chat completions: `gpt-3.5-turbo`

This project is designed to keep costs low by:

- limiting chunk size
- using local vector storage for proofs of concept
- focusing on retrieval quality before larger context windows

---

## Why this project

This project was created as part of my transition from traditional software engineering toward AI implementation and enterprise knowledge systems.

The goal is to explore practical applications of LLMs, Retrieval-Augmented Generation (RAG), vector search and enterprise knowledge integration.

---

## Troubleshooting

### OpenAI key missing

- Add `OPENAI_API_KEY` to `.env`
- Verify the key is valid and has access to the required models

### Model not found

- `gpt-3.5-turbo` is used by default
- Ensure your OpenAI account has access to the configured model

### File not found

- Use relative or absolute paths from the repository root
- Example: `./docs/file.md`

---

## License

MIT
