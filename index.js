import dotenv from "dotenv";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { RAGSystem } from "./lib/rag.js";
import { DocumentLoader } from "./lib/documentLoader.js";

dotenv.config();

const rag = new RAGSystem(process.env.OPENAI_API_KEY);
const docLoader = new DocumentLoader();

/**
 * Show the main menu
 */
async function showMainMenu() {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        new inquirer.Separator("=== DOCUMENTATION ==="),
        { name: "📤 Load document", value: "load" },
        { name: "📚 View loaded documents", value: "list" },
        { name: "🗑️  Delete document", value: "delete" },
        new inquirer.Separator("=== QUERY ==="),
        { name: "❓ Ask the agent", value: "ask" },
        new inquirer.Separator(""),
        { name: "❌ Exit", value: "exit" },
      ],
    },
  ]);

  return answers.action;
}

/**
 * Load a document
 */
async function loadDocument() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "filePath",
      message: "Enter the file path (e.g. ./docs/documentation.txt):",
      validate: (value) => {
        if (!value) return "Path cannot be empty";
        if (!fs.existsSync(value)) return `File not found: ${value}`;
        return true;
      },
    },
  ]);

  try {
    const doc = await docLoader.loadDocument(answers.filePath);
    const chunks = docLoader.chunkDocument(doc.content);
    
    console.log(
      `\n📋 Loaded: ${doc.fileName} (${chunks.length} chunks)\n`
    );

    await rag.addDocument(doc.fileName, chunks);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

/**
 * Show loaded documents
 */
function listDocuments() {
  rag.listDocuments();
}

/**
 * Delete a document
 */
async function deleteDocument() {
  const docNames = Object.keys(rag.vectors);
  
  if (docNames.length === 0) {
    console.log("❌ No loaded documents.\n");
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "docName",
      message: "Which document do you want to delete?",
      choices: docNames,
    },
  ]);

  rag.deleteDocument(answers.docName);
}

/**
 * Ask the agent a question
 */
async function askQuestion() {
  const docNames = Object.keys(rag.vectors);
  
  if (docNames.length === 0) {
    console.log(
      "❌ No documents loaded! Load a document first.\n"
    );
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "question",
      message: "Enter your question:",
      validate: (value) => {
        if (!value) return "Question cannot be empty";
        return true;
      },
    },
  ]);

  try {
    const response = await rag.answer(answers.question);
    if (response) {
      console.log("\n🤖 ANSWER:\n");
      console.log(response);
      console.log("\n");
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

/**
 * Main application
 */
async function main() {
  console.log("🚀 RAG AI Agent - v1.0\n");
  console.log("Welcome! Load a document and ask the agent questions.\n");

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
          console.log("\n👋 Goodbye!\n");
          running = false;
          break;
      }
    } catch (error) {
      console.error(`Error: ${error.message}\n`);
    }
  }
}

main().catch(console.error);
