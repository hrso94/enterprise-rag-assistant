import { JsonVectorStore } from './JsonVectorStore.js';

/**
 * Factory that returns the configured VectorStore implementation.
 *
 * VECTOR_STORE_TYPE=json    — JsonVectorStore  (default, local dev/testing)
 * VECTOR_STORE_TYPE=qdrant  — QdrantVectorStore (production)
 */
export async function createVectorStore() {
  const type = process.env.VECTOR_STORE_TYPE || 'json';

  if (type === 'qdrant') {
    const { QdrantVectorStore } = await import('./QdrantVectorStore.js');
    return new QdrantVectorStore();
  }

  return new JsonVectorStore();
}
