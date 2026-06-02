/**
 * DataSource interface
 * Implementations should return Promise<Document[]> where Document = { fileName, content }
 */
export class DataSource {
  async getDocuments() {
    throw new Error("Not implemented");
  }
}

export class LocalFilesSource extends DataSource {
  constructor(paths) {
    super();
    this.paths = paths;
  }

  async getDocuments() {
    const fs = await import("fs");
    const path = await import("path");
    const documents = [];
    for (const p of this.paths) {
      const content = fs.readFileSync(p, "utf-8");
      documents.push({ fileName: path.basename(p), content });
    }
    return documents;
  }
}

// Mock connectors are intended as examples only
export class MockJiraSource extends DataSource {
  async getDocuments() {
    return [
      { fileName: "JIRA-123.txt", content: "Mock issue description and comments" },
    ];
  }
}

export class MockConfluenceSource extends DataSource {
  async getDocuments() {
    return [
      { fileName: "Confluence-page.md", content: "# Mock Confluence page\nContent here" },
    ];
  }
}
