import fs from "fs";
import path from "path";

export class DocumentLoader {
  constructor() {
    this.maxSize = 10 * 1024 * 1024; // 10MB limit
  }

  /**
   * Load a document based on its type
   */
  async loadDocument(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    if (stat.size > this.maxSize) {
      throw new Error(
        `File is too large (${(stat.size / 1024 / 1024).toFixed(2)}MB). Maximum is 10MB.`
      );
    }

    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".txt":
        return this.loadTxt(filePath);
      case ".md":
        return this.loadMarkdown(filePath);
      case ".json":
        return this.loadJson(filePath);
      case ".docx":
        return this.loadDocx(filePath);
      case ".pdf":
        return this.loadPdf(filePath);
      default:
        throw new Error(`Unsupported format: ${ext}`);
    }
  }

  loadTxt(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    return {
      content,
      fileName: path.basename(filePath),
      type: "text",
    };
  }

  loadMarkdown(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    return {
      content,
      fileName: path.basename(filePath),
      type: "markdown",
    };
  }

  loadJson(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return {
      content: JSON.stringify(data, null, 2),
      fileName: path.basename(filePath),
      type: "json",
    };
  }

  async loadPdf(filePath) {
    try {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = pdfParseModule.default || pdfParseModule["module.exports"];
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return {
        content: data.text,
        fileName: path.basename(filePath),
        type: "pdf",
      };
    } catch (error) {
      throw new Error(`Error loading PDF: ${error.message}`);
    }
  }

  async loadDocx(filePath) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      const content = result.value;
      return {
        content,
        fileName: path.basename(filePath),
        type: "docx",
      };
    } catch (error) {
      throw new Error(`Error loading DOCX: ${error.message}`);
    }
  }

  /**
   * Split document into smaller chunks
   */
  chunkDocument(content, chunkSize = 500, chunkOverlap = 100) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
  }
}
