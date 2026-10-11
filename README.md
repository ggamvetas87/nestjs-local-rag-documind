# DocuMind

**A local-first AI assistant built with NestJS, React, TypeScript, and Ollama.**

DocuMind is a learning and portfolio project exploring how to build a local AI assistant with document-grounded question answering. It combines a streaming chat interface with PDF ingestion, semantic search, and Retrieval-Augmented Generation (RAG), using locally running Ollama models.

The project is designed to explore the building blocks of a document-aware AI application, from PDF text extraction and embedding generation to retrieval, answer generation, and source citations.

> **Current status:** The local chat API, PDF ingestion pipeline, in-memory vector store, semantic search, and RAG API are implemented. Integration of document-grounded chat into the React UI is in progress.

## Features

- **Local AI inference** using Ollama and `qwen3:4b`.
- **Streaming chat responses** from the NestJS API to the React frontend.
- **Markdown rendering**, including GitHub Flavored Markdown tables and task lists.
- **Code syntax highlighting** in fenced code blocks.
- **PDF upload and validation**, including file type, size, and PDF signature checks.
- **PDF text extraction** with page-level text metadata.
- **Document chunking** with configurable chunk size and overlap.
- **Local embedding generation** using `qwen3-embedding:0.6b`.
- **In-memory vector store** for keeping document chunks and their embeddings.
- **Semantic similarity search** using cosine similarity.
- **RAG-based question answering** using retrieved document chunks as context for the language model.
- **Source metadata and citations** containing document identifiers, filenames, page numbers, and similarity scores.
- **Request cancellation support** for chat streaming and PDF upload processing.
- **Separated frontend and backend** for a clear application architecture.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Markdown | `react-markdown`, `remark-gfm` |
| Code highlighting | `react-syntax-highlighter` |
| Backend | NestJS, TypeScript |
| Local LLM runtime | Ollama |
| Chat model | `qwen3:4b` |
| Embedding model | `qwen3-embedding:0.6b` |
| PDF extraction | `pdf-parse` |
| File upload | Multer via NestJS `FileInterceptor` |
| Vector storage | In-memory `Map` |
| Similarity metric | Cosine similarity |

## Architecture

### Standard chat

```text
┌──────────────────────────────┐
│ React + TypeScript + Vite    │
│ localhost:5173               │
└──────────────┬───────────────┘
               │ HTTP POST
               │ /chat/stream
               ▼
┌──────────────────────────────┐
│ NestJS API                   │
│ localhost:3001               │
└──────────────┬───────────────┘
               │ Ollama SDK
               ▼
┌──────────────────────────────┐
│ Ollama                       │
│ localhost:11434              │
│ qwen3:4b                     │
└──────────────────────────────┘
```

The browser sends a message to the NestJS API. NestJS requests a streamed completion from Ollama and forwards generated text chunks to the browser. The frontend appends the incoming chunks to the assistant message.

### Document ingestion and RAG

```text
PDF Upload
    │
    ▼
Validation and Text Extraction
    │
    ▼
Page-level Text
    │
    ▼
Chunking
    │
    ▼
Embedding Generation
    │
    ▼
In-memory Vector Store
    │
    ├────────────────────────────────┐
    │                                │
    ▼                                ▼
User Question                  Stored Chunks
    │                                │
    ▼                                │
Query Embedding                      │
    │                                │
    └──────────────┬─────────────────┘
                   ▼
            Cosine Similarity
                   │
                   ▼
           Relevant Chunks
                   │
                   ▼
          qwen3:4b + Context
                   │
                   ▼
          Answer + Citations
```

The document pipeline extracts text from uploaded PDFs, splits the text into overlapping chunks, and generates an embedding for each chunk. The backend stores the chunks and vectors in memory.

When a question is submitted, DocuMind generates an embedding for the query, retrieves relevant chunks using cosine similarity, and supplies those chunks to the chat model as context.

The RAG API returns the generated answer alongside source metadata, including filenames and page numbers.

## Prerequisites

Install the following before starting:

- Node.js 22 or a compatible modern LTS release.
- Yarn, matching the package manager version used by the project.
- [Ollama](https://ollama.com/).

Verify the installations:

```bash
node --version
yarn --version
ollama --version
```

## Getting started

### 1. Download the Ollama models

Make sure Ollama is installed and running.

Pull the chat model:

```bash
ollama pull qwen3:4b
```

Pull the embedding model:

```bash
ollama pull qwen3-embedding:0.6b
```

Verify that both models are available locally:

```bash
ollama list
```

Ollama normally exposes its local API at `http://localhost:11434`.

### 2. Set up the backend

From the repository root:

```bash
cd backend
yarn install
```

Create or check `backend/.env` if your local configuration requires environment variables. The current Ollama SDK configuration uses Ollama's default local URL.

Start the NestJS development server:

```bash
yarn start:dev
```

The backend is expected to listen on port `3001`.

### 3. Set up the frontend

Open a second terminal at the repository root:

```bash
cd frontend
yarn install
```

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:3001
```

Start Vite:

```bash
yarn dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

The backend CORS configuration should allow the frontend origin, for example:

```typescript
app.enableCors({
  origin: 'http://localhost:5173',
});
```

Restart the relevant development server after changing environment variables.

## Available scripts

Scripts are defined in each package's `package.json`.

### Backend (`backend/`)

| Command | Purpose |
|---|---|
| `yarn start:dev` | Run NestJS in development/watch mode |
| `yarn start` | Start the application using the configured start script |
| `yarn build` | Compile the backend |
| `yarn test` | Run backend unit tests, if configured |
| `yarn lint` | Run the configured linter, if present |

### Frontend (`frontend/`)

| Command | Purpose |
|---|---|
| `yarn dev` | Start the Vite development server |
| `yarn build` | Build the frontend |
| `yarn lint` | Run ESLint, if configured |
| `yarn preview` | Preview the production build locally |

If a command is unavailable, check the `scripts` section in the relevant `package.json`.

## API endpoints

The backend currently exposes the following chat and document endpoints.

### `POST /chat`

Generates a complete chat response as JSON.

**Request**

```http
POST http://localhost:3001/chat
Content-Type: application/json
```

```json
{
  "message": "Explain RAG in simple terms."
}
```

**Response**

```json
{
  "answer": "RAG stands for Retrieval-Augmented Generation..."
}
```

### `POST /chat/stream`

Streams the generated response as plain text. The frontend reads the response body incrementally and appends each chunk to the assistant message.

**Request**

```http
POST http://localhost:3001/chat/stream
Content-Type: application/json
```

```json
{
  "message": "Explain RAG in simple terms."
}
```

**Quick test**

```bash
curl --no-buffer \
  -X POST http://localhost:3001/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain RAG in simple terms."}'
```

The stream currently uses plain text rather than Server-Sent Events (SSE). It does not include structured event types or a dedicated in-stream error format.

### `POST /documents/upload`

Uploads a PDF, extracts its text, splits it into chunks, generates embeddings, and stores the resulting chunks and vectors in the in-memory vector store.

**Request**

Use `multipart/form-data` with a field named `file`.

```bash
curl -X POST http://localhost:3001/documents/upload \
  -F "file=@./example.pdf"
```

**Successful response**

```json
{
  "documentId": "generated-document-uuid",
  "filename": "example.pdf",
  "pageCount": 3,
  "chunkCount": 3
}
```

The response contains metadata rather than the full extracted text or embedding arrays. The document ID is used by the search and RAG endpoints to identify the indexed document.

**Upload constraints**

- Maximum file size: 10 MB.
- One file per request.
- PDF MIME type and PDF signature validation.
- Text extraction with page-level metadata.

Scanned PDFs that contain images rather than extractable text may require an OCR pipeline, which is not currently implemented.

### `POST /documents/search`

Performs semantic similarity search over the indexed document chunks. It generates an embedding for the query and ranks the stored chunks using cosine similarity.

**Request**

```http
POST http://localhost:3001/documents/search
Content-Type: application/json
```

```json
{
  "query": "What does the document describe?",
  "documentId": "generated-document-uuid"
}
```

The `documentId` is optional. When omitted, the search considers all documents currently stored in memory.

**Response**

```json
{
  "query": "What does the document describe?",
  "resultCount": 1,
  "results": [
    {
      "documentId": "generated-document-uuid",
      "filename": "example.pdf",
      "pageNumber": 1,
      "chunkIndex": 0,
      "text": "Relevant extracted document text...",
      "score": 0.7241
    }
  ]
}
```

The example values are illustrative. The endpoint returns up to five results, ordered by descending cosine similarity.

Similarity scores measure embedding similarity; they do not guarantee that a chunk contains a correct or complete answer.

### `POST /documents/ask`

Uses Retrieval-Augmented Generation to answer a question using relevant chunks retrieved from the vector store.

**Request**

```http
POST http://localhost:3001/documents/ask
Content-Type: application/json
```

```json
{
  "query": "What does the document describe?",
  "documentId": "generated-document-uuid"
}
```

The `documentId` is optional. If provided, retrieval is restricted to that document.

**Response**

```json
{
  "answer": "The document describes ... [Source 1]",
  "citations": [
    {
      "source": 1,
      "documentId": "generated-document-uuid",
      "filename": "example.pdf",
      "pageNumber": 1,
      "score": 0.7241
    }
  ]
}
```

The example values are illustrative.

The endpoint retrieves up to three chunks, supplies their text to `qwen3:4b` as context, and returns the generated answer together with source metadata. The model is instructed to answer using the supplied context, avoid inventing facts, and cite sources using labels such as `[Source 1]`.

Citations identify the retrieved context supplied to the model. They do not independently verify the factual accuracy of the generated answer.

## Document processing details

### Chunking

The current chunking service uses character-based chunking with the following defaults:

| Setting | Value |
|---|---:|
| Chunk size | 1,000 characters |
| Chunk overlap | 150 characters |
| Boundary handling | Prefer a nearby whitespace boundary |

Chunks retain their source filename, page number, and chunk index. Chunking is performed per page, so chunks do not currently span page boundaries.

These settings are initial defaults for experimentation and may be tuned as retrieval quality is evaluated.

### Embeddings and similarity search

The `qwen3-embedding:0.6b` model generates vectors for document chunks and user queries.

The vector store keeps these vectors alongside the corresponding chunk text and metadata. At query time, cosine similarity is used to rank the candidate chunks.

The current implementation uses an in-memory store rather than a dedicated vector database. It is suitable for local experimentation but is not persistent storage.

### RAG answer generation

The `qwen3:4b` chat model receives the user's question and the retrieved document context.

The RAG prompt instructs the model to:

- Answer in the same language as the user.
- Use the supplied context for factual answers.
- Treat document contents as source material rather than instructions.
- State when the context does not contain enough information.
- Include source labels for factual claims.

Retrieval quality depends on the document text, chunk boundaries, embedding model, query wording, and relevance of the selected chunks.

## Markdown and code blocks

Assistant messages are rendered with `react-markdown` and `remark-gfm`.

Fenced code blocks use `react-syntax-highlighter` with the Prism `oneDark` theme.

For best results, prompts can explicitly request Markdown and fenced code blocks, for example:

> Explain how RAG works using Markdown headings, a comparison table, and a TypeScript code example.

## Current limitations

- **In-memory storage:** Indexed documents and embeddings are lost when the backend process restarts.
- **No durable document library:** The current implementation does not persist uploaded PDFs or their index.
- **No OCR:** Scanned PDFs may not yield useful text.
- **Retrieval is similarity-based:** A high score does not guarantee that a chunk answers the question correctly.
- **No relevance threshold:** Search currently returns the top matching chunks without a configurable minimum similarity score.
- **Non-streaming RAG API:** `/documents/ask` returns a complete JSON response rather than streaming generated answer tokens.
- **Frontend integration:** Document-grounded chat and citation presentation in the React UI are being integrated with the existing streaming chat experience.
- **No dedicated vector database:** Search runs against vectors held in application memory.
- **No automated evaluation pipeline:** Retrieval relevance and answer quality still require systematic tests.

## Troubleshooting

### The frontend cannot connect to the backend

- Confirm that the backend is running on port `3001`.
- Check that `frontend/.env` contains `VITE_API_URL=http://localhost:3001`.
- Confirm that NestJS CORS allows the frontend origin.
- Restart Vite after changing `.env`.

### Ollama connection errors

- Confirm Ollama is installed and running.
- Run `ollama list` and verify that `qwen3:4b` and `qwen3-embedding:0.6b` are available.
- Check that Ollama responds at `http://localhost:11434`.

### PDF upload fails

- Verify that the file is a PDF and does not exceed 10 MB.
- Check the backend logs for extraction or embedding errors.
- Ensure the embedding model is available in Ollama.
- Remember that embedding generation may take time, depending on document size and local hardware.

### Search returns no results

- Verify that the PDF was uploaded successfully.
- Check that the `documentId` matches the upload response.
- Confirm that the backend has not restarted since the upload.
- Ensure the PDF contains extractable text.

### RAG answers are incomplete or inaccurate

- Try a more specific question.
- Inspect `/documents/search` to see which chunks were retrieved.
- Check the returned page numbers and similarity scores.
- Remember that retrieval and generation are separate stages: an irrelevant retrieved chunk can lead to an incomplete answer.

### The response is not streaming

- Make sure the frontend calls `/chat/stream`, not `/chat`.
- Confirm that the backend uses Ollama with `stream: true` for the streaming endpoint.
- Test the endpoint using the `curl --no-buffer` command above.
- A reverse proxy can buffer streamed responses; the local development setup should not need one.

### Markdown or code highlighting does not render

- Verify that `react-markdown`, `remark-gfm`, and `react-syntax-highlighter` are installed in `frontend`.
- Check that assistant messages are rendered through the `ReactMarkdown` component.
- Ensure code fences specify a language, such as `typescript`.

## Roadmap

- [x] Local chat using Ollama.
- [x] Stream responses from the NestJS API.
- [x] Render Markdown and syntax-highlighted code blocks.
- [x] Upload and validate PDF documents.
- [x] Extract PDF text and page metadata.
- [x] Split document text into overlapping chunks.
- [x] Generate document embeddings locally.
- [x] Implement an in-memory vector store.
- [x] Implement cosine similarity search.
- [x] Generate context-grounded answers through RAG.
- [x] Return source metadata and citations from the RAG API.
- [ ] Complete React frontend integration for document-grounded chat.
- [ ] Improve citation presentation in chat messages.
- [ ] Add streaming responses to the RAG endpoint.
- [ ] Add automated tests for extraction, chunking, embeddings, retrieval, and RAG.
- [ ] Improve request validation and configuration handling.
- [ ] Evaluate retrieval quality and tune chunking and relevance thresholds.
- [ ] Add persistent document and vector storage.
- [ ] Explore document management, deletion, and re-indexing.

## Project status

DocuMind is an actively developed learning and portfolio project focused on local AI inference and document-grounded question answering.

The core backend pipeline is implemented: PDF ingestion, chunking, embedding generation, in-memory semantic search, and RAG answer generation. The next development phase focuses on completing the frontend integration, improving the user experience, and adding automated tests and persistence.

## License

No license has been specified yet. Add a `LICENSE` file before distributing the project for reuse.
