/**
 * Abstract interface for vector storage backends.
 *
 * Implementations: JsonVectorStore (local dev/testing), QdrantVectorStore (production).
 * Switch via VECTOR_STORE_TYPE env var.
 */
export class VectorStore {
  /**
   * Insert or replace all chunks for a document.
   * @param {string} docName
   * @param {{ id: number, text: string, embedding: number[] }[]} chunks
   */
  async upsertDocument(docName, chunks) {
    throw new Error(`${this.constructor.name}.upsertDocument() not implemented`);
  }

  /**
   * Remove all chunks for a document.
   * @param {string} docName
   * @throws if document not found
   */
  async removeDocument(docName) {
    throw new Error(`${this.constructor.name}.removeDocument() not implemented`);
  }

  /**
   * Return all chunks across all documents (used for retrieval).
   * @returns {{ source: string, text: string, embedding: number[] }[]}
   */
  async getAllChunks() {
    throw new Error(`${this.constructor.name}.getAllChunks() not implemented`);
  }

  /**
   * Return document metadata (no embeddings).
   * @returns {{ name: string, chunkCount: number }[]}
   */
  async listDocuments() {
    throw new Error(`${this.constructor.name}.listDocuments() not implemented`);
  }
}
