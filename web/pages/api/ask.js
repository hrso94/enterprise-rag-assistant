import path from 'path';
import dotenv from 'dotenv';
import { RAGSystem } from '../../../lib/rag.js';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// Lazy singleton — one RAGSystem per process, reused across warm invocations
let ragPromise = null;
function getRAG() {
  if (!ragPromise) ragPromise = RAGSystem.create(process.env.OPENAI_API_KEY);
  return ragPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query must be a non-empty string' });
  }
  if (query.trim().length === 0) {
    return res.status(400).json({ error: 'query cannot be blank' });
  }
  if (query.length > 2000) {
    return res.status(400).json({ error: 'query exceeds maximum length of 2000 characters' });
  }

  try {
    const rag = await getRAG();
    const result = await rag.answer(query.trim());
    return res.status(200).json(result); // { answer, sources, retrievedChunks }
  } catch {
    return res.status(500).json({ error: 'Failed to process query' });
  }
}
