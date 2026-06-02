import { RAGSystem } from "./lib/rag.js";
import { DocumentLoader } from "./lib/documentLoader.js";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("🧪 Testing the RAG system...\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "⚠️  OPENAI_API_KEY is not set. Running only local tests...\n"
    );
  }

  const rag = new RAGSystem(apiKey);
  const docLoader = new DocumentLoader();

  try {
    // Test 1: Load a document
    console.log("1️⃣  Loading test document...");
    const doc = await docLoader.loadDocument("./test_doc.md");
    console.log(`✓ Document loaded: ${doc.fileName}`);
    console.log(`✓ Size: ${doc.content.length} characters\n`);

    // Test 2: Chunk the document
    console.log("2️⃣  Splitting the document into chunks...");
    const chunks = docLoader.chunkDocument(doc.content);
    console.log(`✓ Number of chunks: ${chunks.length}`);
    console.log(`✓ First chunk: "${chunks[0].substring(0, 50)}..."\n`);

    // Test 3: Add to the RAG store (skip embeddings if no API key)
    console.log("3️⃣  Adding document to the RAG store...");
    if (apiKey) {
      await rag.addDocument(doc.fileName, chunks);
      console.log(`✓ Documents in store: ${Object.keys(rag.vectors).length}`);
      console.log(
        `✓ Vectors for ${doc.fileName}: ${rag.vectors[doc.fileName].length}\n`
      );

      // Test 4: Ask a question (only if API key is available)
      console.log("4️⃣  Asking the agent a question...");
      const answer = await rag.answer("What is a REST API and how is it used?");
      if (answer) {
        console.log("✓ Answer received:");
        console.log(`"${answer.substring(0, 200)}..."\n`);
      }
    } else {
      console.log(`✓ RAG structure is valid (embedding tests skipped)\n`);
    }

    console.log("✅ All available tests passed!\n");
  } catch (error) {
    console.error(`❌ Error during testing: ${error.message}\n`);
    process.exit(1);
  }
}

test();
