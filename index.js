import dotenv from 'dotenv';
import inquirer from 'inquirer';
import fs from 'fs';
import { RAGSystem } from './lib/rag.js';
import { DocumentLoader } from './lib/documentLoader.js';

dotenv.config();

const docLoader = new DocumentLoader();

async function showMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        new inquirer.Separator('=== DOCUMENTATION ==='),
        { name: 'Load document', value: 'load' },
        { name: 'View loaded documents', value: 'list' },
        { name: 'Delete document', value: 'delete' },
        new inquirer.Separator('=== QUERY ==='),
        { name: 'Ask the agent', value: 'ask' },
        new inquirer.Separator(''),
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);
  return action;
}

async function loadDocument(rag) {
  const { filePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Enter the file path (e.g. ./docs/documentation.txt):',
      validate: (value) => {
        if (!value) return 'Path cannot be empty';
        if (!fs.existsSync(value)) return `File not found: ${value}`;
        return true;
      },
    },
  ]);

  try {
    const doc = await docLoader.loadDocument(filePath);
    const chunks = docLoader.chunkDocument(doc.content);
    console.log(`\nLoaded: ${doc.fileName} — ${chunks.length} chunks\n`);
    await rag.addDocument(doc.fileName, chunks);
    console.log(`Indexed "${doc.fileName}".\n`);
  } catch (err) {
    console.error(`Error: ${err.message}\n`);
  }
}

async function listDocuments(rag) {
  const docs = await rag.listDocuments();
  if (docs.length === 0) {
    console.log('\nNo documents loaded.\n');
    return;
  }
  console.log('\nLoaded documents:');
  docs.forEach(d => console.log(`  ${d.name}  (${d.chunkCount} chunks)`));
  console.log();
}

async function deleteDocument(rag) {
  const docs = await rag.listDocuments();
  if (docs.length === 0) {
    console.log('No loaded documents.\n');
    return;
  }

  const { docName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'docName',
      message: 'Which document do you want to delete?',
      choices: docs.map(d => d.name),
    },
  ]);

  try {
    await rag.removeDocument(docName);
    console.log(`Removed "${docName}".\n`);
  } catch (err) {
    console.error(`Error: ${err.message}\n`);
  }
}

async function askQuestion(rag) {
  const docs = await rag.listDocuments();
  if (docs.length === 0) {
    console.log('No documents loaded. Load a document first.\n');
    return;
  }

  const { question } = await inquirer.prompt([
    {
      type: 'input',
      name: 'question',
      message: 'Enter your question:',
      validate: (v) => v.trim() ? true : 'Question cannot be empty',
    },
  ]);

  try {
    const { answer, sources, retrievedChunks } = await rag.answer(question);
    console.log('\nANSWER:\n');
    console.log(answer);
    if (sources.length > 0) {
      console.log(`\nSources: ${sources.join(', ')}  (${retrievedChunks} chunks)`);
    }
    console.log();
  } catch (err) {
    console.error(`Error: ${err.message}\n`);
  }
}

async function main() {
  console.log('Enterprise RAG Assistant\n');

  const rag = await RAGSystem.create(process.env.OPENAI_API_KEY);

  let running = true;
  while (running) {
    try {
      const action = await showMainMenu();
      switch (action) {
        case 'load':   await loadDocument(rag); break;
        case 'list':   await listDocuments(rag); break;
        case 'delete': await deleteDocument(rag); break;
        case 'ask':    await askQuestion(rag); break;
        case 'exit':
          console.log('\nGoodbye!\n');
          running = false;
          break;
      }
    } catch (err) {
      console.error(`Error: ${err.message}\n`);
    }
  }
}

main().catch(console.error);
