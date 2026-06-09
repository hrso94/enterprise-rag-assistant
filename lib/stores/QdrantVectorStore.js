import { VectorStore } from './VectorStore.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Dimensionality for text-embedding-3-small
const VECTOR_SIZE = 1536;

/**
 * Production vector store backed by Qdrant.
 *
 * Requires a running Qdrant instance (Docker: `docker run -p 6333:6333 qdrant/qdrant`).
 * Configure via QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION env vars.
 *
 * Advantages over JsonVectorStore:
 *  - HNSW index: O(log n) ANN search instead of O(n) brute-force
 *  - Persistent storage independent of this process
 *  - Metadata filtering (foundation for per-document RBAC)
 *  - Horizontal scalability
 */
export class QdrantVectorStore extends VectorStore {
  constructor() {
    super();
    // Defer client init so the import error (missing package) surfaces at
    // instantiation time with a clear message, not at module load time.
    this._ready = this._init();
  }

  async _init() {
    let QdrantClient;
    try {
      ({ QdrantClient } = await import('@qdrant/js-client-rest'));
    } catch {
      throw new Error(
        'QdrantVectorStore requires @qdrant/js-client-rest. Run: npm install @qdrant/js-client-rest'
      );
    }

    this.client = new QdrantClient({
      url: config.qdrant.url,
      ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
    });

    await this._ensureCollection();
  }

  async _ensureCollection() {
    const collection = config.qdrant.collection;
    try {
      await this.client.getCollection(collection);
    } catch {
      await this.client.createCollection(collection, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      logger.info('Qdrant collection created', { collection });
    }
  }

  async upsertDocument(docName, chunks) {
    await this._ready;
    const collection = config.qdrant.collection;

    // Delete existing points for this document before re-inserting
    await this.client.delete(collection, {
      filter: { must: [{ key: 'source', match: { value: docName } }] },
    });

    const points = chunks.map((chunk, i) => ({
      // Qdrant requires numeric or UUID point IDs; we hash docName+index
      id: this._pointId(docName, i),
      vector: chunk.embedding,
      payload: { source: docName, text: chunk.text, chunkIndex: i },
    }));

    await this.client.upsert(collection, { wait: true, points });
  }

  async removeDocument(docName) {
    await this._ready;
    await this.client.delete(config.qdrant.collection, {
      filter: { must: [{ key: 'source', match: { value: docName } }] },
    });
  }

  async getAllChunks() {
    await this._ready;
    const response = await this.client.scroll(config.qdrant.collection, {
      with_vector: true,
      with_payload: true,
      limit: 10_000,
    });
    return response.points.map(p => ({
      source: p.payload.source,
      text: p.payload.text,
      embedding: p.vector,
    }));
  }

  async listDocuments() {
    const chunks = await this.getAllChunks();
    const counts = new Map();
    for (const { source } of chunks) {
      counts.set(source, (counts.get(source) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, chunkCount]) => ({ name, chunkCount }));
  }

  // Deterministic numeric ID from document name + chunk index
  _pointId(docName, index) {
    let hash = 0;
    const str = `${docName}__${index}`;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
