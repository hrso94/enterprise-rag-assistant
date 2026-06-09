import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import { DocumentLoader } from './lib/documentLoader.js';
import { RAGSystem } from './lib/rag.js';
import { RAGEvaluator } from './lib/evaluator.js';
import { hybridSearch } from './lib/retrieval/hybridSearch.js';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn('OPENAI_API_KEY not set — API-dependent tests will be skipped\n');
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

function skip(name) {
  console.log(`  - ${name} (skipped — no API key)`);
}

// ─── DocumentLoader ───────────────────────────────────────────────────────────
console.log('\nDocumentLoader');

await test('loads a markdown file', async () => {
  const loader = new DocumentLoader();
  const doc = await loader.loadDocument('./test_doc.md');
  assert.strictEqual(doc.type, 'markdown');
  assert.ok(doc.fileName.length > 0);
  assert.ok(doc.content.length > 0);
});

await test('loads a plain text file', async () => {
  const tmp = path.join(os.tmpdir(), 'rag_test.txt');
  fs.writeFileSync(tmp, 'Hello world. This is a test.');
  const doc = await new DocumentLoader().loadDocument(tmp);
  assert.strictEqual(doc.type, 'text');
  assert.ok(doc.content.includes('Hello'));
  fs.unlinkSync(tmp);
});

await test('loads a JSON file', async () => {
  const tmp = path.join(os.tmpdir(), 'rag_test.json');
  fs.writeFileSync(tmp, JSON.stringify({ key: 'value' }));
  const doc = await new DocumentLoader().loadDocument(tmp);
  assert.strictEqual(doc.type, 'json');
  assert.ok(doc.content.includes('key'));
  fs.unlinkSync(tmp);
});

await test('throws for a non-existent file', async () => {
  await assert.rejects(
    () => new DocumentLoader().loadDocument('./does_not_exist.txt'),
    /File not found/
  );
});

await test('throws for an unsupported file extension', async () => {
  const tmp = path.join(os.tmpdir(), 'rag_test.xyz');
  fs.writeFileSync(tmp, 'data');
  await assert.rejects(
    () => new DocumentLoader().loadDocument(tmp),
    /Unsupported format/
  );
  fs.unlinkSync(tmp);
});

await test('throws for a file exceeding the size limit', async () => {
  const tmp = path.join(os.tmpdir(), 'rag_big.txt');
  fs.writeFileSync(tmp, Buffer.alloc(11 * 1024 * 1024, 'x'));
  await assert.rejects(
    () => new DocumentLoader().loadDocument(tmp),
    /too large/i
  );
  fs.unlinkSync(tmp);
});

// ─── Chunking ─────────────────────────────────────────────────────────────────
console.log('\nChunking');

await test('splits long content into multiple chunks', async () => {
  const chunks = new DocumentLoader().chunkDocument(
    'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.',
    50, 10
  );
  assert.ok(chunks.length > 1);
});

await test('returns empty array for empty or whitespace-only content', async () => {
  const loader = new DocumentLoader();
  assert.deepStrictEqual(loader.chunkDocument(''), []);
  assert.deepStrictEqual(loader.chunkDocument('   '), []);
});

await test('returns a single chunk for short content', async () => {
  const chunks = new DocumentLoader().chunkDocument('Short sentence.', 500, 100);
  assert.strictEqual(chunks.length, 1);
});

await test('no chunk exceeds chunkSize by more than one sentence', async () => {
  const sentence = 'This is a known-length sentence here. '; // ~38 chars
  const chunks = new DocumentLoader().chunkDocument(sentence.repeat(20), 100, 20);
  for (const chunk of chunks) {
    assert.ok(chunk.length < 250, `Chunk too large: ${chunk.length} chars`);
  }
});

await test('overlap carries tail of previous chunk into the next', async () => {
  const text = 'Alpha sentence here. Beta sentence here. Gamma sentence here. Delta sentence here. Epsilon sentence.';
  const chunks = new DocumentLoader().chunkDocument(text, 60, 20);
  if (chunks.length > 1) {
    const tailOfFirst = chunks[0].slice(-15).trim();
    assert.ok(
      chunks[1].includes(tailOfFirst.slice(0, 8)),
      `Expected overlap from "${tailOfFirst}" at start of chunk[1]: "${chunks[1].slice(0, 40)}"`
    );
  }
});

await test('handles content without sentence-ending punctuation', async () => {
  const chunks = new DocumentLoader().chunkDocument('no punctuation here just words', 20, 5);
  assert.ok(chunks.length >= 1);
});

// ─── Hybrid Search ────────────────────────────────────────────────────────────
console.log('\nHybrid Search');

const mockChunks = [
  { source: 'doc1.txt', text: 'JWT authentication tokens are used for API security.',  embedding: Array(4).fill(0).map((_, i) => i === 0 ? 1 : 0) },
  { source: 'doc1.txt', text: 'REST API endpoints return JSON responses.',              embedding: Array(4).fill(0).map((_, i) => i === 1 ? 1 : 0) },
  { source: 'doc2.txt', text: 'Rate limiting prevents API abuse with request quotas.',  embedding: Array(4).fill(0).map((_, i) => i === 2 ? 1 : 0) },
];

await test('returns empty array when chunk list is empty', () => {
  const results = hybridSearch([], 'authentication', [1, 0, 0, 0], { topK: 3 });
  assert.deepStrictEqual(results, []);
});

await test('results include source, text, score, vectorScore, bm25Score', () => {
  const results = hybridSearch(mockChunks, 'JWT authentication', [1, 0, 0, 0], { topK: 3, similarityThreshold: 0 });
  assert.ok(results.length > 0);
  const r = results[0];
  assert.ok(typeof r.source === 'string');
  assert.ok(typeof r.text === 'string');
  assert.ok(typeof r.score === 'number');
  assert.ok(typeof r.vectorScore === 'number');
  assert.ok(typeof r.bm25Score === 'number');
});

await test('results are sorted descending by combined score', () => {
  const results = hybridSearch(mockChunks, 'JWT authentication', [1, 0, 0, 0], { topK: 5, similarityThreshold: 0 });
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i - 1].score >= results[i].score);
  }
});

await test('similarityThreshold filters low-confidence results', () => {
  // Query embedding points away from all chunks → all vectorScores ≈ 0
  const results = hybridSearch(mockChunks, 'JWT', [0, 0, 0, 1], { topK: 5, similarityThreshold: 0.9 });
  assert.strictEqual(results.length, 0);
});

await test('alpha=1 uses only vector scores', () => {
  const results = hybridSearch(mockChunks, 'ignored query terms', [1, 0, 0, 0], {
    topK: 3, alpha: 1, similarityThreshold: 0,
  });
  // With alpha=1 the chunk with embedding [1,0,0,0] should rank first
  assert.strictEqual(results[0].source, 'doc1.txt');
  assert.ok(results[0].text.includes('JWT'));
});

await test('respects topK limit', () => {
  const results = hybridSearch(mockChunks, 'API', [0.5, 0.5, 0, 0], { topK: 2, similarityThreshold: 0 });
  assert.ok(results.length <= 2);
});

// ─── RAGSystem — no API ───────────────────────────────────────────────────────
console.log('\nRAGSystem (local)');

await test('create() returns a RAGSystem instance without API key', async () => {
  const rag = await RAGSystem.create(null);
  assert.ok(rag instanceof RAGSystem);
});

await test('listDocuments() returns an array', async () => {
  const rag = await RAGSystem.create(null);
  const docs = await rag.listDocuments();
  assert.ok(Array.isArray(docs));
});

await test('removeDocument() throws for an unknown document', async () => {
  const rag = await RAGSystem.create(null);
  await assert.rejects(
    () => rag.removeDocument('__does_not_exist__.txt'),
    /Document not found/
  );
});

await test('answer() throws when no API key is configured', async () => {
  const rag = await RAGSystem.create(null);
  await assert.rejects(
    () => rag.answer('test query'),
    /API key/i
  );
});

await test('answer() throws for an empty or blank query', async () => {
  const rag = await RAGSystem.create(apiKey || 'dummy');
  await assert.rejects(() => rag.answer(''), /empty/i);
  await assert.rejects(() => rag.answer('   '), /empty/i);
});

// ─── RAGSystem — API ──────────────────────────────────────────────────────────
console.log('\nRAGSystem (API)');

if (apiKey) {
  const loader = new DocumentLoader();
  const rag = await RAGSystem.create(apiKey);

  await test('addDocument() indexes chunks and persists to store', async () => {
    const doc = await loader.loadDocument('./test_doc.md');
    const chunks = loader.chunkDocument(doc.content);
    assert.ok(chunks.length > 0);

    await rag.addDocument(doc.fileName, chunks);

    const docs = await rag.listDocuments();
    const found = docs.find(d => d.name === doc.fileName);
    assert.ok(found, 'document should appear in listDocuments');
    assert.strictEqual(found.chunkCount, chunks.length);
  });

  await test('addDocument() on same name replaces old chunks', async () => {
    await rag.addDocument('test_doc.md', ['Single replacement chunk.']);
    const docs = await rag.listDocuments();
    const found = docs.find(d => d.name === 'test_doc.md');
    assert.strictEqual(found.chunkCount, 1);

    // Re-index original for following tests
    const doc = await loader.loadDocument('./test_doc.md');
    await rag.addDocument(doc.fileName, loader.chunkDocument(doc.content));
  });

  await test('retrieve() returns objects with score, vectorScore, bm25Score, source', async () => {
    const results = await rag.retrieve('JWT authentication');
    assert.ok(Array.isArray(results));
    if (results.length > 0) {
      const r = results[0];
      assert.ok(typeof r.score === 'number');
      assert.ok(typeof r.vectorScore === 'number');
      assert.ok(typeof r.bm25Score === 'number');
      assert.ok(typeof r.source === 'string');
      assert.ok(typeof r.text === 'string');
    }
  });

  await test('retrieve() results are sorted descending by score', async () => {
    const results = await rag.retrieve('REST API endpoints');
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].score >= results[i].score);
    }
  });

  await test('answer() returns { answer, sources, retrievedChunks }', async () => {
    const result = await rag.answer('How does JWT authentication work?');
    assert.ok(typeof result.answer === 'string');
    assert.ok(Array.isArray(result.sources));
    assert.ok(typeof result.retrievedChunks === 'number');
  });

  await test('answer() returns no-results response for out-of-corpus query', async () => {
    const result = await rag.answer('What is the current price of gold in Tokyo?');
    assert.ok(
      result.retrievedChunks === 0 ||
      result.answer.toLowerCase().includes('not') ||
      result.answer.toLowerCase().includes('no'),
      'Should indicate missing information for irrelevant query'
    );
  });

  // ─── RAGEvaluator ─────────────────────────────────────────────────────────
  console.log('\nRAGEvaluator (API)');

  await test('evaluate() returns hitRate, mrr, keywordPrecision metrics', async () => {
    const evaluator = new RAGEvaluator(rag);

    // Ground truth based on test_doc.md content
    const testCases = [
      {
        query: 'How does JWT authentication work?',
        expectedSources: ['test_doc.md'],
        expectedKeywords: ['JWT', 'token', 'Authorization'],
      },
      {
        query: 'What HTTP methods are available for users?',
        expectedSources: ['test_doc.md'],
        expectedKeywords: ['GET', 'POST', 'PUT', 'DELETE'],
      },
      {
        query: 'What error code means the user is not authenticated?',
        expectedSources: ['test_doc.md'],
        expectedKeywords: ['401'],
      },
      {
        query: 'What is the rate limit for the API?',
        expectedSources: ['test_doc.md'],
        expectedKeywords: ['1000', 'hour'],
      },
    ];

    const report = await evaluator.evaluate(testCases);

    assert.strictEqual(report.totalCases, testCases.length);
    assert.ok(report.hitRate !== null, 'hitRate should be computed');
    assert.ok(report.mrr !== null, 'mrr should be computed');
    assert.ok(report.hitRate >= 0 && report.hitRate <= 1);
    assert.ok(report.mrr >= 0 && report.mrr <= 1);

    console.log(`    hitRate=${report.hitRate}  mrr=${report.mrr}  keywordPrecision=${report.keywordPrecision}`);
  });
} else {
  [
    'addDocument() indexes chunks',
    'addDocument() replaces old chunks on re-index',
    'retrieve() returns scored objects with source',
    'retrieve() results sorted by score',
    'answer() returns structured object',
    'answer() returns no-results for out-of-corpus query',
    'evaluate() returns hitRate, mrr, keywordPrecision',
  ].forEach(skip);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
