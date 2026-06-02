import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorDbPath = path.join(__dirname, "../data/vectors.json");

export class RAGSystem {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.vectors = this.loadVectors();
    this.model = "text-embedding-3-small";
    this.chatModel = "gpt-5.4-mini";
  }

  /**
   * Učitaj postojeće vektore iz datoteke
   */
  loadVectors() {
    try {
      if (fs.existsSync(vectorDbPath)) {
        const data = fs.readFileSync(vectorDbPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn("Nije moguće učitati vektore:", error.message);
    }
    return {};
  }

  /**
   * Spremi vektore u datoteku
   */
  saveVectors() {
    fs.writeFileSync(vectorDbPath, JSON.stringify(this.vectors, null, 2));
  }

  /**
   * Generiraj embedding za tekst
   */
  async getEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`Greška pri generiranju embeddinga: ${error.message}`);
    }
  }

  /**
   * Dodaj dokument u RAG bazu
   */
  async addDocument(docName, chunks) {
    console.log(`\n📚 Procesuiram dokument: ${docName}`);
    
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
    console.log(`✅ Dokument ${docName} je dodan u bazu!\n`);
  }

  /**
   * Izračunaj sličnost između dva vektora (cosine similarity)
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
   * Pronađi relevantne dijelove (retrieval)
   */
  async retrieveRelevantChunks(query, topK = 3) {
    const queryEmbedding = await this.getEmbedding(query);
    const results = [];

    // Pretraži kroz sve dokumente
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

    // Sortiraj po sličnosti i vrati top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((r) => r.text)
      .join("\n\n---\n\n");
  }

  /**
   * Postavi pitanje agentu koristeći RAG
   */
  async answer(query) {
    console.log(`\n🔍 Tražim relevantnu dokumentaciju...\n`);

    // Ako nema učitanih dokumenata
    if (Object.keys(this.vectors).length === 0) {
      console.log("❌ Nema učitanih dokumenata!\n");
      return null;
    }

    const context = await this.retrieveRelevantChunks(query);

    if (!context) {
      console.log("❌ Nije pronađena relevantna dokumentacija.\n");
      return null;
    }

    console.log("📄 Pronađeni relevantni dijelovi:");
    console.log(
      context.substring(0, 300) + (context.length > 300 ? "..." : "")
    );
    console.log("\n⚙️  Generiram odgovor...\n");

    const systemPrompt = `Ti si helpful asistent koji odgovara na pitanja koristeći dostavljenu dokumentaciju.
Ako nije moguće pronaći odgovor u dokumentaciji, reci to korisniku.
Biti koncizan i direktan u odgovorima.

DOKUMENTACIJA:
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
      throw new Error(`Greška pri generiranju odgovora: ${error.message}`);
    }
  }

  /**
   * Prikaži dostupne dokumente
   */
  listDocuments() {
    const docNames = Object.keys(this.vectors);
    if (docNames.length === 0) {
      console.log("Nema učitanih dokumenata.");
      return;
    }
    console.log("\n📚 Učitani dokumenti:");
    docNames.forEach((doc) => {
      const chunkCount = this.vectors[doc].length;
      console.log(`  ✓ ${doc} (${chunkCount} dijelova)`);
    });
    console.log();
  }

  /**
   * Obriši dokument
   */
  deleteDocument(docName) {
    if (this.vectors[docName]) {
      delete this.vectors[docName];
      this.saveVectors();
      console.log(`✓ Dokument ${docName} je obrisan.\n`);
    } else {
      console.log(`❌ Dokument ${docName} nije pronađen.\n`);
    }
  }
}
