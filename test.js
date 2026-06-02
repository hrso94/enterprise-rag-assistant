import { RAGSystem } from "./lib/rag.js";
import { DocumentLoader } from "./lib/documentLoader.js";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("🧪 Testiranje RAG sistema...\n");

  const rag = new RAGSystem(process.env.OPENAI_API_KEY);
  const docLoader = new DocumentLoader();

  try {
    // Test 1: Učitaj dokument
    console.log("1️⃣  Učitavam test dokument...");
    const doc = await docLoader.loadDocument("./test_doc.md");
    console.log(`✓ Dokument učitan: ${doc.fileName}`);
    console.log(`✓ Veličina: ${doc.content.length} znakova\n`);

    // Test 2: Chunkiraj dokument
    console.log("2️⃣  Dijelim dokument na dijelove...");
    const chunks = docLoader.chunkDocument(doc.content);
    console.log(`✓ Broj dijelova: ${chunks.length}`);
    console.log(`✓ Prvi komad: "${chunks[0].substring(0, 50)}..."\n`);

    // Test 3: Dodaj u RAG bazu
    console.log("3️⃣  Dodajem u RAG bazu...");
    await rag.addDocument(doc.fileName, chunks);
    console.log(`✓ Dokumenti u bazi: ${Object.keys(rag.vectors).length}`);
    console.log(
      `✓ Vektori za ${doc.fileName}: ${rag.vectors[doc.fileName].length}\n`
    );

    // Test 4: Postavi pitanje
    console.log("4️⃣  Postavljam pitanje agentu...");
    const answer = await rag.answer("Što je REST API i kako se koristi?");
    if (answer) {
      console.log("✓ Odgovor primljen:");
      console.log(`"${answer.substring(0, 200)}..."\n`);
    }

    console.log("✅ Svi testovi su prošli!\n");
  } catch (error) {
    console.error(`❌ Greška tijekom testiranja: ${error.message}\n`);
    process.exit(1);
  }
}

test();
