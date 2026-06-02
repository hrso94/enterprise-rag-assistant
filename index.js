import OpenAI from "openai";
import dotenv from "dotenv";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { RAGSystem } from "./lib/rag.js";
import { DocumentLoader } from "./lib/documentLoader.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rag = new RAGSystem(process.env.OPENAI_API_KEY);
const docLoader = new DocumentLoader();

/**
 * Prikaži glavni menu
 */
async function showMainMenu() {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Što želiš napraviti?",
      choices: [
        new inquirer.Separator("=== DOKUMENTACIJA ==="),
        { name: "📤 Učitaj dokument", value: "load" },
        { name: "📚 Vidi učitane dokumente", value: "list" },
        { name: "🗑️  Obriši dokument", value: "delete" },
        new inquirer.Separator("=== UPIT ==="),
        { name: "❓ Postavi pitanje agentu", value: "ask" },
        new inquirer.Separator(""),
        { name: "❌ Izlaz", value: "exit" },
      ],
    },
  ]);

  return answers.action;
}

/**
 * Učitaj dokument
 */
async function loadDocument() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "filePath",
      message: "Unesi putanju do datoteke (npr. ./docs/dokumentacija.txt):",
      validate: (value) => {
        if (!value) return "Putanja ne može biti prazna";
        if (!fs.existsSync(value)) return `Datoteka nije pronađena: ${value}`;
        return true;
      },
    },
  ]);

  try {
    const doc = await docLoader.loadDocument(answers.filePath);
    const chunks = docLoader.chunkDocument(doc.content);
    
    console.log(
      `\n📋 Učitano: ${doc.fileName} (${chunks.length} dijelova)\n`
    );

    await rag.addDocument(doc.fileName, chunks);
  } catch (error) {
    console.error(`❌ Greška: ${error.message}\n`);
  }
}

/**
 * Prikaži učitane dokumente
 */
function listDocuments() {
  rag.listDocuments();
}

/**
 * Obriši dokument
 */
async function deleteDocument() {
  const docNames = Object.keys(rag.vectors);
  
  if (docNames.length === 0) {
    console.log("❌ Nema učitanih dokumenata.\n");
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "docName",
      message: "Koji dokument želiš obrisati?",
      choices: docNames,
    },
  ]);

  rag.deleteDocument(answers.docName);
}

/**
 * Postavi pitanje agentu
 */
async function askQuestion() {
  const docNames = Object.keys(rag.vectors);
  
  if (docNames.length === 0) {
    console.log(
      "❌ Nema učitanih dokumenata! Prvo učitaj dokument.\n"
    );
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "question",
      message: "Postavi pitanje:",
      validate: (value) => {
        if (!value) return "Pitanje ne može biti prazno";
        return true;
      },
    },
  ]);

  try {
    const response = await rag.answer(answers.question);
    if (response) {
      console.log("\n🤖 ODGOVOR:\n");
      console.log(response);
      console.log("\n");
    }
  } catch (error) {
    console.error(`❌ Greška: ${error.message}\n`);
  }
}

/**
 * Glavna aplikacija
 */
async function main() {
  console.log("🚀 RAG AI Agent - v1.0\n");
  console.log("Dobrodošao! Učitaj dokument i postavi pitanja agentu.\n");

  let running = true;

  while (running) {
    try {
      const action = await showMainMenu();

      switch (action) {
        case "load":
          await loadDocument();
          break;
        case "list":
          listDocuments();
          break;
        case "delete":
          await deleteDocument();
          break;
        case "ask":
          await askQuestion();
          break;
        case "exit":
          console.log("\n👋 Doviđenja!\n");
          running = false;
          break;
      }
    } catch (error) {
      console.error(`Greška: ${error.message}\n`);
    }
  }
}

main().catch(console.error);
