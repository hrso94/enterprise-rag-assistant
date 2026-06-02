# Connectors (skeletons)

This folder contains connector skeletons and guidance for integrating enterprise sources.

Structure:

- `connectors/interface.js` - DataSource interface definition
- `connectors/local/` - Local files connector (implemented)
- `connectors/mock/` - Mock Jira/Confluence/SharePoint connectors (TODO)

Guidelines:

- Implement `getDocuments(): Promise<Document[]>` which returns objects `{ fileName, content }`.
- Use OAuth or PAT for authentication; do not commit secrets.
- Implement permission-aware retrieval (filtering by user) in production.
