import fs from 'fs';
import path from 'path';
import { config } from './config.js';

export class DocumentLoader {
  constructor() {
    this.maxSize = config.storage.maxFileSizeMB * 1024 * 1024;
  }

  async loadDocument(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    if (stat.size > this.maxSize) {
      throw new Error(
        `File too large (${(stat.size / 1024 / 1024).toFixed(2)} MB). Maximum is ${config.storage.maxFileSizeMB} MB.`
      );
    }

    const ext = path.extname(filePath).toLowerCase();
    const loaders = {
      '.txt':  () => this._loadText(filePath, 'text'),
      '.md':   () => this._loadText(filePath, 'markdown'),
      '.json': () => this._loadJson(filePath),
      '.docx': () => this._loadDocx(filePath),
      '.pdf':  () => this._loadPdf(filePath),
    };

    const loader = loaders[ext];
    if (!loader) throw new Error(`Unsupported format: ${ext}`);
    return loader();
  }

  _loadText(filePath, type) {
    return {
      content: fs.readFileSync(filePath, 'utf-8'),
      fileName: path.basename(filePath),
      type,
    };
  }

  _loadJson(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return {
      content: JSON.stringify(JSON.parse(raw), null, 2),
      fileName: path.basename(filePath),
      type: 'json',
    };
  }

  async _loadPdf(filePath) {
    try {
      const pdfParse = await import('pdf-parse');
      const parse = pdfParse.default || pdfParse['module.exports'];
      const data = await parse(fs.readFileSync(filePath));
      return { content: data.text, fileName: path.basename(filePath), type: 'pdf' };
    } catch (err) {
      throw new Error(`Error loading PDF: ${err.message}`);
    }
  }

  async _loadDocx(filePath) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return { content: result.value, fileName: path.basename(filePath), type: 'docx' };
    } catch (err) {
      throw new Error(`Error loading DOCX: ${err.message}`);
    }
  }

  // Sentence-boundary chunking with overlap.
  // Overlap carries the tail of the previous chunk into the next so context
  // is not lost when a concept spans a chunk boundary.
  chunkDocument(content, chunkSize = config.chunking.size, chunkOverlap = config.chunking.overlap) {
    if (!content?.trim()) return [];

    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      if (current.length + sentence.length > chunkSize && current.length > 0) {
        chunks.push(current.trim());
        current = current.slice(-chunkOverlap) + sentence;
      } else {
        current += sentence;
      }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }
}
