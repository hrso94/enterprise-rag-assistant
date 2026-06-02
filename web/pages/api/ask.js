import path from "path";
import dotenv from "dotenv";
import { RAGSystem } from "../../../lib/rag.js";

// Load root .env when running web dev from 'web' directory
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

let rag;
if (!global.ragInstance) {
  global.ragInstance = new RAGSystem(process.env.OPENAI_API_KEY);
}
rag = global.ragInstance;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Missing question" });

    const answer = await rag.answer(question);
    res.status(200).json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
