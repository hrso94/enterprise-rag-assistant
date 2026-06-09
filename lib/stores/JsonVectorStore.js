import fs from 'fs';
import path from 'path';
import { VectorStore } from './VectorStore.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * File-based vector store. Suitable for local development and testing.
 *
 * NOT suitable for production: O(n) scan at query time, entire store loaded
 * into memory on startup, no concurrent write safety.
 * Migrate to QdrantVectorStore for >1k chunks or multi-instance deployments.
 */
export class JsonVectorStore extends VectorStore {
  constructor() {
    super();
    this.dbPath = config.storage.vectorDbPath;
    this.data = this._load();
    logger.debug('JsonVectorStore loaded', {
      path: this.dbPath,
      documents: Object.keys(this.data).length,
    });
  }

  _load() {
    if (fs.existsSync(this.dbPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
      } catch (err) {
        logger.error('Failed to parse JSON vector store, starting fresh', { error: err.message });
        return {};
      }
    }
    return {};
  }

  _persist() {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  async upsertDocument(docName, chunks) {
    this.data[docName] = chunks;
    this._persist();
  }

  async removeDocument(docName) {
    if (!this.data[docName]) throw new Error(`Document not found: ${docName}`);
    delete this.data[docName];
    this._persist();
  }

  async getAllChunks() {
    const result = [];
    for (const [source, chunks] of Object.entries(this.data)) {
      for (const chunk of chunks) {
        result.push({ source, text: chunk.text, embedding: chunk.embedding });
      }
    }
    return result;
  }

  async listDocuments() {
    return Object.entries(this.data).map(([name, chunks]) => ({
      name,
      chunkCount: chunks.length,
    }));
  }
}
