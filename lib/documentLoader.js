import fs from "fs";
import path from "path";

export class DocumentLoader {
  constructor() {
    this.maxSize = 10 * 1024 * 1024; // 10MB limit
  }

  /**
   * Učitaj dokument na osnovu tipa
   */
  async loadDocument(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Datoteka nije pronađena: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    if (stat.size > this.maxSize) {
      throw new Error(
        `Datoteka je prevelika (${(stat.size / 1024 / 1024).toFixed(2)}MB). Maksimalno je 10MB.`
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
        throw new Error(`Nepodržan format: ${ext}`);
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
      throw new Error(`Greška pri učitavanju PDF-a: ${error.message}`);
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
      throw new Error(`Greška pri učitavanju DOCX-a: ${error.message}`);
    }
  }

  /**
   * Podijeli dokument na manje dijelove (chunks)
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
