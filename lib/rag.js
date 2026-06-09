import OpenAI from 'openai';
import { createVectorStore } from './stores/index.js';
import { hybridSearch } from './retrieval/hybridSearch.js';
import { config } from './config.js';
import { logger } from './logger.js';

export class RAGSystem {
  constructor(apiKey, store) {
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.store = store;
    logger.info('RAG system initialized', {
      embeddingModel: config.embedding.model,
      chatModel: config.chat.model,
      storeType: store.constructor.name,
      apiKeyPresent: !!apiKey,
    });
  }

  /**
   * Preferred instantiation method.
   * Allows the store backend to be swapped via VECTOR_STORE_TYPE without
   * changing call sites.
   */
  static async create(apiKey) {
    const store = await createVectorStore();
    return new RAGSystem(apiKey, store);
  }

  // Exponential backoff retry for transient API failures (429, 5xx)
  async _withRetry(fn, context) {
    const { maxRetries, retryBaseDelayMs } = config.api;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isRetryable = err.status === 429 || (err.status >= 500 && err.status < 600);
        if (!isRetryable || attempt === maxRetries) {
          logger.error('API call failed permanently', { context, attempt, error: err.message });
          throw err;
        }
        const delay = retryBaseDelayMs * Math.pow(2, attempt - 1);
        logger.warn('Retrying after error', { context, attempt, delayMs: delay, error: err.message });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Batch embedding reduces HTTP calls from O(n) to O(n/batchSize)
  async _getEmbeddings(texts) {
    if (!this.openai) throw new Error('OpenAI API key is required for embeddings');
    const { model, batchSize } = config.embedding;
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this._withRetry(
        () => this.openai.embeddings.create({ model, input: batch }),
        'getEmbeddings'
      );
      allEmbeddings.push(...response.data.map(d => d.embedding));
    }

    return allEmbeddings;
  }

  /**
   * Index a document. Calling again with the same docName replaces the old index.
   * @param {string} docName
   * @param {string[]} chunks - plain text chunks from DocumentLoader
   */
  async addDocument(docName, chunks) {
    const start = Date.now();
    logger.info('Indexing document', { docName, chunkCount: chunks.length });

    const embeddings = await this._getEmbeddings(chunks);
    const chunkObjects = chunks.map((text, i) => ({ id: i, text, embedding: embeddings[i] }));

    await this.store.upsertDocument(docName, chunkObjects);
    logger.info('Document indexed', { docName, chunkCount: chunks.length, durationMs: Date.now() - start });
  }

  /**
   * Hybrid retrieval: combines dense vector similarity with BM25 keyword matching.
   *
   * Returns results above the similarity threshold with source attribution.
   * Returning no results (rather than low-confidence ones) prevents hallucination
   * when queries fall outside the indexed corpus.
   *
   * @param {string} query
   * @returns {Array<{source, text, score, vectorScore, bm25Score}>}
   */
  async retrieve(query) {
    const { topK, similarityThreshold, hybridAlpha } = config.retrieval;
    const [queryEmbedding] = await this._getEmbeddings([query]);
    const allChunks = await this.store.getAllChunks();

    const results = hybridSearch(allChunks, query, queryEmbedding, {
      topK,
      alpha: hybridAlpha,
      similarityThreshold,
    });

    logger.debug('Retrieval complete', {
      query,
      totalChunks: allChunks.length,
      retrieved: results.length,
      topScore: results[0]?.score.toFixed(4) ?? null,
      topVectorScore: results[0]?.vectorScore.toFixed(4) ?? null,
    });

    return results;
  }

  /**
   * Answer a question using retrieved context.
   * @param {string} query
   * @returns {{ answer: string, sources: string[], retrievedChunks: number }}
   */
  async answer(query) {
    if (!query?.trim()) throw new Error('Query cannot be empty');

    const start = Date.now();
    const retrieved = await this.retrieve(query.trim());

    if (retrieved.length === 0) {
      logger.info('No relevant chunks found', { query });
      return {
        answer: 'No relevant information found in the documentation for this query.',
        sources: [],
        retrievedChunks: 0,
      };
    }

    const context = retrieved
      .map(r => `[Source: ${r.source}]\n${r.text}`)
      .join('\n\n---\n\n');

    const sources = [...new Set(retrieved.map(r => r.source))];

    const response = await this._withRetry(
      () => this.openai.chat.completions.create({
        model: config.chat.model,
        temperature: config.chat.temperature,
        max_tokens: config.chat.maxTokens,
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that answers questions based strictly on the provided documentation.
If the answer cannot be found in the documentation, say so clearly — do not make up information.`,
          },
          {
            role: 'user',
            content: `Documentation:\n\n${context}\n\nQuestion: ${query}`,
          },
        ],
      }),
      'chatCompletion'
    );

    logger.info('Query answered', {
      durationMs: Date.now() - start,
      retrievedChunks: retrieved.length,
      sources,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    });

    return {
      answer: response.choices[0].message.content,
      sources,
      retrievedChunks: retrieved.length,
    };
  }

  async listDocuments() {
    return this.store.listDocuments();
  }

  async removeDocument(docName) {
    await this.store.removeDocument(docName);
    logger.info('Document removed', { docName });
  }
}
