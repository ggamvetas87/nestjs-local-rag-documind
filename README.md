# DocuMind

**A local-first AI assistant built with NestJS, React, TypeScript, PostgreSQL, and Ollama.**

DocuMind combines streaming chat with document ingestion, semantic search, persistent vector storage, and Retrieval-Augmented Generation (RAG). It runs inference locally through Ollama and returns source metadata with document-grounded answers.

![DocuMind chat interface](docs/img/screenshot-1.png)

*The DocuMind local chat interface.*

## Documentation

- [Overview](docs/overview.md): features, supported files, technology, and project status.
- [Setup](docs/setup.md): prerequisites, environment variables, database, Ollama, and development servers.
- [Architecture](docs/architecture.md): chat, ingestion, RAG, and persistence flows.
- [API](docs/api.md): endpoint requests, responses, and upload constraints.
- [Document Processing](docs/document-processing.md): extraction, chunking, embeddings, search, and citations.
- [Frontend](docs/frontend.md): chat UI, document selection, restoration, Markdown, and cancellation.
- [Troubleshooting](docs/troubleshooting.md): common local development and runtime issues.
- [Roadmap](docs/roadmap.md): completed work, limitations, and planned improvements.

## Quick Start

1. Install Node.js, Yarn, Ollama, and Podman.
2. Pull the required Ollama models:

   ```bash
   ollama pull qwen3:4b
   ollama pull qwen3-embedding:0.6b
   ```

3. Start PostgreSQL with pgvector:

   ```bash
   podman-compose -f podman-compose.local.yml up -d
   ```

4. Configure `backend/.env` and run the backend:

   ```bash
   cd backend
   yarn install
   yarn migration:run
   yarn start:dev
   ```

5. Configure `frontend/.env` and run the frontend in another terminal:

   ```bash
   cd frontend
   yarn install
   yarn dev
   ```

See [Setup](docs/setup.md) for the complete configuration and environment values.

## Project Structure

```text
backend/   NestJS API, extraction, RAG, persistence, and migrations
frontend/  React chat and document interface
docs/      Project documentation
```

## License

No license has been specified yet. Add a `LICENSE` file before distributing the project for reuse.
