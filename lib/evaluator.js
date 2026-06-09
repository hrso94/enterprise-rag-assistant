/**
 * Offline retrieval evaluation — no LLM needed.
 *
 * Usage:
 *   const evaluator = new RAGEvaluator(ragSystem);
 *   const report = await evaluator.evaluate([
 *     { query: 'What is OAuth?', expectedSources: ['auth.md'], expectedKeywords: ['token', 'scope'] },
 *   ]);
 *   console.log(report);
 *
 * Metrics:
 *   hitRate        — fraction of test cases where a relevant source appears in top-K results
 *   mrr            — Mean Reciprocal Rank (higher = relevant results rank earlier)
 *   keywordPrecision — fraction of expected keywords found across retrieved chunks
 */
export class RAGEvaluator {
  constructor(ragSystem) {
    this.rag = ragSystem;
  }

  async evaluate(testCases) {
    if (!testCases?.length) throw new Error('testCases must be a non-empty array');

    const results = [];
    for (const tc of testCases) {
      const retrieved = await this.rag.retrieve(tc.query);
      results.push(this._scoreCase(tc, retrieved));
    }

    return this._aggregate(results);
  }

  _scoreCase({ query, expectedSources = [], expectedKeywords = [] }, retrieved) {
    let hitRate = null;
    let mrr = 0;

    if (expectedSources.length > 0) {
      hitRate = retrieved.some(r => expectedSources.includes(r.source)) ? 1 : 0;
      const firstHitIndex = retrieved.findIndex(r => expectedSources.includes(r.source));
      if (firstHitIndex !== -1) mrr = 1 / (firstHitIndex + 1);
    }

    let keywordPrecision = null;
    if (expectedKeywords.length > 0) {
      const hits = expectedKeywords.filter(kw =>
        retrieved.some(r => r.text.toLowerCase().includes(kw.toLowerCase()))
      );
      keywordPrecision = hits.length / expectedKeywords.length;
    }

    return {
      query,
      hitRate,
      mrr,
      keywordPrecision,
      topScore: retrieved[0]?.score.toFixed(4) ?? null,
      retrieved: retrieved.length,
    };
  }

  _aggregate(results) {
    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

    const withSource = results.filter(r => r.hitRate !== null);
    const withKeyword = results.filter(r => r.keywordPrecision !== null);

    return {
      totalCases: results.length,
      hitRate:         withSource.length  ? +avg(withSource.map(r => r.hitRate)).toFixed(3)          : null,
      mrr:             withSource.length  ? +avg(withSource.map(r => r.mrr)).toFixed(3)              : null,
      keywordPrecision: withKeyword.length ? +avg(withKeyword.map(r => r.keywordPrecision)).toFixed(3) : null,
      cases: results,
    };
  }
}
