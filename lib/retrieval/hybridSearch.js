// BM25 hyperparameters — standard literature defaults
const K1 = 1.5; // term saturation: diminishing returns for repeated terms
const B = 0.75; // length normalization: penalizes long documents

function tokenize(text) {
  return text.toLowerCase().match(/\b\w+\b/g) || [];
}

function buildBM25Index(docs) {
  const N = docs.length;
  const totalTokens = docs.reduce((s, d) => s + tokenize(d.text).length, 0);
  const avgdl = N > 0 ? totalTokens / N : 1;

  const df = new Map();
  const termFreqs = docs.map(doc => {
    const tokens = tokenize(doc.text);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
    return { dl: tokens.length, tf };
  });

  const idf = new Map();
  for (const [term, freq] of df) {
    idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
  }

  return { termFreqs, idf, avgdl };
}

function bm25Score(docIndex, queryTokens, { termFreqs, idf, avgdl }) {
  const { dl, tf } = termFreqs[docIndex];
  let score = 0;
  for (const t of queryTokens) {
    const idfVal = idf.get(t) || 0;
    const freq = tf.get(t) || 0;
    score += idfVal * (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (dl / avgdl)));
  }
  return score;
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Hybrid retrieval: weighted combination of dense vector search and BM25 keyword search.
 *
 * Dense search excels at semantic similarity ("how do I log in" → authentication).
 * BM25 excels at exact-term matches (product names, error codes, technical jargon).
 * Combining both covers cases that either approach misses alone.
 *
 * @param {Array<{source, text, embedding}>} chunks - all indexed chunks
 * @param {string} query
 * @param {number[]} queryEmbedding
 * @param {object} options
 * @param {number} options.topK
 * @param {number} options.alpha - weight for vector score [0=pure BM25, 1=pure vector]
 * @param {number} options.similarityThreshold - min vector score to include result
 * @returns {Array<{source, text, score, vectorScore, bm25Score}>}
 */
export function hybridSearch(chunks, query, queryEmbedding, {
  topK = 5,
  alpha = 0.7,
  similarityThreshold = 0.0,
} = {}) {
  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  const bm25Index = buildBM25Index(chunks);

  const vectorScores = chunks.map(c => cosineSimilarity(queryEmbedding, c.embedding));
  const rawBm25Scores = chunks.map((_, i) => bm25Score(i, queryTokens, bm25Index));

  // Normalize BM25 to [0, 1] so it's comparable to cosine similarity
  const maxBm25 = Math.max(...rawBm25Scores, 1e-9);

  const results = chunks.map((chunk, i) => ({
    source: chunk.source,
    text: chunk.text,
    vectorScore: vectorScores[i],
    bm25Score: rawBm25Scores[i] / maxBm25,
    score: alpha * vectorScores[i] + (1 - alpha) * (rawBm25Scores[i] / maxBm25),
  }));

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(r => r.vectorScore >= similarityThreshold);
}
