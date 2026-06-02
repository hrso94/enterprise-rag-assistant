import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorDbPath = path.join(__dirname, "../data/vectors.json");

export class RAGSystem {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.vectors = this.loadVectors();
    this.model = "text-embedding-3-small";
    this.chatModel = "gpt-5.4-mini";
  }

  /**
   * Load existing vectors from file
   */
  loadVectors() {
    try {
      if (fs.existsSync(vectorDbPath)) {
        const data = fs.readFileSync(vectorDbPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn("Unable to load vectors:", error.message);
    }
    return {};
  }

  /**
   * Save vectors to file
   */
  saveVectors() {
    fs.writeFileSync(vectorDbPath, JSON.stringify(this.vectors, null, 2));
  }

  /**
   * Generate embedding for text
   */
  async getEmbedding(text) {
    if (!this.openai) {
      throw new Error("OpenAI API key is required to generate embeddings.");
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`Error generating embedding: ${error.message}`);
    }
  }

  /**
   * Add document to the RAG database
   */
  async addDocument(docName, chunks) {
    console.log(`\n📚 Processing document: ${docName}`);
    
    if (!this.vectors[docName]) {
      this.vectors[docName] = [];
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`  ⏳ Chunk ${i + 1}/${chunks.length}...`);
      
      const embedding = await this.getEmbedding(chunk);
      this.vectors[docName].push({
        id: i,
        text: chunk,
        embedding: embedding,
      });
    }

    this.saveVectors();
    console.log(`✅ Document ${docName} has been added to the store!\n`);
  }

  /**
   * Calculate similarity between two vectors (cosine similarity)
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Find relevant chunks (retrieval)
   */
  async retrieveRelevantChunks(query, topK = 3) {
    const queryEmbedding = await this.getEmbedding(query);
    const results = [];

    // Search through all documents
    for (const [docName, chunks] of Object.entries(this.vectors)) {
      for (const chunk of chunks) {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          chunk.embedding
        );
        results.push({
          docName,
          text: chunk.text,
          similarity,
        });
      }
    }

    // Sort by similarity and return the top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((r) => r.text)
      .join("\n\n---\n\n");
  }

  /**
   * Ask a question using RAG
   */
  async answer(query) {
    console.log(`\n🔍 Searching for relevant documentation...\n`);

    // If no documents are loaded
    if (Object.keys(this.vectors).length === 0) {
      console.log("❌ No documents loaded!\n");
      return null;
    }

    const context = await this.retrieveRelevantChunks(query);

    if (!context) {
      console.log("❌ No relevant documentation found.\n");
      return null;
    }

    console.log("📄 Relevant chunks found:");
    console.log(
      context.substring(0, 300) + (context.length > 300 ? "..." : "")
    );
    console.log("\n⚙️  Generating answer...\n");

    const systemPrompt = `You are a helpful assistant that answers questions using the provided documentation.
If the answer cannot be found in the documentation, say so to the user.
Be concise and direct in your responses.

DOCUMENTATION:
${context}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: query,
          },
        ],
      });

      return response.choices[0].message.content;
    } catch (error) {
      throw new Error(`Error generating answer: ${error.message}`);
    }
  }

  /**
   * Show available documents
   */
  listDocuments() {
    const docNames = Object.keys(this.vectors);
    if (docNames.length === 0) {
      console.log("No loaded documents.");
      return;
    }
    console.log("\n📚 Loaded documents:");
    docNames.forEach((doc) => {
      const chunkCount = this.vectors[doc].length;
      console.log(`  ✓ ${doc} (${chunkCount} chunks)`);
    });
    console.log();
  }

  /**
   * Delete a document
   */
  deleteDocument(docName) {
    if (this.vectors[docName]) {
      delete this.vectors[docName];
      this.saveVectors();
      console.log(`✓ Document ${docName} has been deleted.\n`);
    } else {
      console.log(`❌ Document ${docName} was not found.\n`);
    }
  }
}
