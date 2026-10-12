# Architecture

DocuMind has a Vite React frontend, a NestJS API, Ollama for local inference, and PostgreSQL with pgvector for persistent document storage and vector search.

## Standard Chat

```text
React + TypeScript + Vite
        │ POST /chat/stream
        ▼
NestJS API
        │ Ollama SDK
        ▼
Ollama: qwen3:4b
```

The browser sends a message to NestJS. NestJS requests a streamed completion from Ollama and forwards text chunks to the browser, where they are appended to the assistant message.

## Document Ingestion and RAG

```text
Upload
  │
  ▼
Validate and extract text
  │
  ▼
Preserve metadata such as pages or worksheets
  │
  ▼
Chunk extracted text
  │
  ▼
Generate embeddings
  │
  ▼
Persist documents, chunks, metadata, and vectors
  │
  ▼
Embed the user's question
  │
  ▼
Search PostgreSQL with pgvector
  │
  ▼
Send relevant chunks to qwen3:4b
  │
  ▼
Return an answer with citations
```

Uploaded documents remain available after a frontend refresh or backend restart when the PostgreSQL data is preserved. The frontend retrieves saved metadata through `GET /documents`.

## Main Components

- `frontend/`: React chat UI, document upload, document selection, Markdown rendering, and citation display.
- `backend/src/chat/`: standard and streaming Ollama chat endpoints.
- `backend/src/documents/`: upload validation, extraction, chunking, document retrieval, and RAG orchestration.
- `backend/src/vector-store/`: PostgreSQL and pgvector persistence and similarity search.
- `backend/src/database/`: TypeORM data source and migrations.

## Persistence Model

The database stores document metadata in `documents` and extracted chunks in `document_chunks`.

Each chunk references its parent document through a foreign key. Deleting a document at the database level cascades to its chunks. Embeddings are stored with 1,024 dimensions and are reused for later questions.
