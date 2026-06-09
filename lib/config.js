import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE) || 100,
  },
  chat: {
    model: process.env.CHAT_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.CHAT_TEMPERATURE) || 0.1,
    maxTokens: parseInt(process.env.CHAT_MAX_TOKENS) || 1000,
  },
  retrieval: {
    topK: parseInt(process.env.RETRIEVAL_TOP_K) || 5,
    // Queries scoring below this threshold return no results rather than a
    // hallucinated answer. Tune downward if relevant docs are being filtered out.
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.55,
    // alpha=1 → pure vector; alpha=0 → pure BM25; 0.7 is a reasonable starting point
    hybridAlpha: parseFloat(process.env.HYBRID_ALPHA) || 0.7,
  },
  chunking: {
    size: parseInt(process.env.CHUNK_SIZE) || 500,
    overlap: parseInt(process.env.CHUNK_OVERLAP) || 100,
  },
  storage: {
    vectorDbPath: process.env.VECTOR_DB_PATH || path.join(__dirname, '../data/vectors.json'),
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
    collection: process.env.QDRANT_COLLECTION || 'enterprise-rag',
  },
  api: {
    maxRetries: parseInt(process.env.API_MAX_RETRIES) || 3,
    retryBaseDelayMs: parseInt(process.env.API_RETRY_BASE_DELAY_MS) || 1000,
  },
};
