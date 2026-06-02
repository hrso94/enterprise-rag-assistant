import path from "path";
import dotenv from "dotenv";
import { RAGSystem } from "../../../lib/rag.js";

// Load root .env when running the web app from web/ directory
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

// Create a singleton RAG instance across lambda invocations
let rag;
if (!global.ragInstance) {
  global.ragInstance = new RAGSystem(process.env.OPENAI_API_KEY);
}
rag = global.ragInstance;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { fileName, content } = req.body;
    if (!fileName || !content) return res.status(400).json({ error: "Missing fileName or content" });

    // Simple chunking: reuse RAGSystem's chunking via creating a small helper
    const chunks = [];
    const chunkSize = 500;
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    let current = "";
    for (const s of sentences) {
      if ((current + s).length > chunkSize) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current) chunks.push(current.trim());

    await rag.addDocument(fileName, chunks);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
