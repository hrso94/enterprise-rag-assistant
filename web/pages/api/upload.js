import path from 'path';
import dotenv from 'dotenv';
import { RAGSystem } from '../../../lib/rag.js';
import { DocumentLoader } from '../../../lib/documentLoader.js';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

let ragPromise = null;
function getRAG() {
  if (!ragPromise) ragPromise = RAGSystem.create(process.env.OPENAI_API_KEY);
  return ragPromise;
}

const docLoader = new DocumentLoader();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, content } = req.body;

  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    return res.status(400).json({ error: 'fileName must be a non-empty string' });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'content must be a non-empty string' });
  }

  try {
    const chunks = docLoader.chunkDocument(content);
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Document produced no chunks after processing' });
    }

    const rag = await getRAG();
    await rag.addDocument(fileName.trim(), chunks);
    return res.status(200).json({ ok: true, chunkCount: chunks.length });
  } catch {
    return res.status(500).json({ error: 'Failed to process document' });
  }
}
