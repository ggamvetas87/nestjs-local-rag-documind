# DocuMind

**A local-first AI assistant built with NestJS, React, and Ollama.**

DocuMind is a learning project for building an AI chat application that
runs an open-weight language model locally. The current version provides
a chat UI, Markdown rendering, code syntax highlighting, and streamed
responses from Ollama.

> **Current scope:** The chat interface and local LLM integration are
> implemented. PDF ingestion and retrieval-augmented generation (RAG)
> are planned next; the application does not yet answer questions from
> an indexed document collection.

## Features

-   **Local inference** with Ollama and `qwen3:4b`.
-   **Streaming responses** from the NestJS API to the React UI.
-   **Markdown rendering**, including GitHub Flavored Markdown tables
    and task lists.
-   **Code syntax highlighting** in fenced code blocks.
-   **Request validation** for chat messages.
-   **Separated frontend and backend** for a clear application
    architecture.

## Tech stack

  -----------------------------------------------------------------------
  Area                                Technology
  ----------------------------------- -----------------------------------
  Frontend                            React, TypeScript, Vite

  Markdown                            `react-markdown`, `remark-gfm`

  Code highlighting                   `react-syntax-highlighter`

  Backend                             NestJS, TypeScript

  Local LLM runtime                   Ollama

  Chat model                          `qwen3:4b`

  Embedding model downloaded for      `qwen3-embedding:0.6b`
  planned RAG work                    
  -----------------------------------------------------------------------

## Architecture

``` text
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

The browser sends a message to the NestJS API. NestJS requests a
streamed completion from Ollama and forwards generated text chunks to
the browser. The frontend updates the assistant message as chunks
arrive.

## Prerequisites

Install the following before starting:

-   Node.js (Node 22 or a compatible modern LTS release is recommended)
-   Yarn, matching the package manager version used by the project
-   [Ollama](https://ollama.com/)

Verify your installations:

``` bash
node --version
yarn --version
ollama --version
```

## Getting started

### 1. Download the Ollama models

Make sure the Ollama service is running, then pull the chat model:

``` bash
ollama pull qwen3:4b
```

An embedding model has also been downloaded for the planned
document-retrieval phase:

``` bash
ollama pull qwen3-embedding:0.6b
```

The embedding model is **not yet used by the current chat flow**.

Check the models available locally:

``` bash
ollama list
```

Ollama normally exposes its local API at `http://localhost:11434`.

### 2. Set up the backend

Open a terminal at the repository root:

``` bash
cd backend
yarn install
```

Create or check `backend/.env` if your local configuration requires
environment variables. The current Ollama SDK setup uses Ollama's
default local URL (`http://localhost:11434`).

Start the NestJS development server:

``` bash
yarn start:dev
```

The backend is expected to listen on **port 3001**.

### 3. Set up the frontend

Open a second terminal at the repository root:

``` bash
cd frontend
yarn install
```

Create `frontend/.env`:

``` dotenv
VITE_API_URL=http://localhost:3001
```

Start Vite:

``` bash
yarn dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

The backend CORS configuration should allow the frontend origin, for
example:

``` typescript
app.enableCors({
  origin: 'http://localhost:5173',
});
```

Restart the relevant development server after changing environment
variables.

## Available scripts

Scripts are defined in each package's `package.json`. The following are
the standard commands used by this project setup; the exact available
scripts depend on the current package files.

### Backend (`backend/`)

  Command            Purpose
  ------------------ -----------------------------------------------
  `yarn start:dev`   Run NestJS in development/watch mode
  `yarn start`       Start the compiled/default NestJS application
  `yarn build`       Compile the backend
  `yarn test`        Run backend unit tests
  `yarn lint`        Run the configured linter, if present

### Frontend (`frontend/`)

  Command          Purpose
  ---------------- ------------------------------------------
  `yarn dev`       Start the Vite development server
  `yarn build`     Type-check/build the production frontend
  `yarn lint`      Run ESLint, if configured
  `yarn preview`   Preview the production build locally

If a command is unavailable, check the `scripts` section in that
directory's `package.json`.

## API endpoints

### `POST /chat`

Returns a complete response as JSON.

**Request**

``` http
POST http://localhost:3001/chat
Content-Type: application/json
```

``` json
{
  "message": "Explain RAG in simple terms."
}
```

**Response**

``` json
{
  "answer": "RAG stands for Retrieval-Augmented Generation..."
}
```

### `POST /chat/stream`

Streams the generated response as plain text. The frontend reads the
response body incrementally and appends each chunk to the assistant
message.

**Request**

``` http
POST http://localhost:3001/chat/stream
Content-Type: application/json
```

``` json
{
  "message": "Explain RAG in simple terms."
}
```

Quick test with `curl`:

``` bash
curl --no-buffer \
  -X POST http://localhost:3001/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain RAG in simple terms."}'
```

The stream is currently plain text rather than Server-Sent Events (SSE);
it does not include structured event types or a dedicated in-stream
error format.

## Markdown and code blocks

Assistant messages are rendered with `react-markdown` and `remark-gfm`.
Fenced code blocks use `react-syntax-highlighter` with the Prism
`oneDark` theme.

For best results, prompts can explicitly request Markdown and fenced
code blocks, for example:

> Explain how RAG works using Markdown headings, a comparison table, and
> a TypeScript code example.

## Troubleshooting

### The frontend cannot connect to the backend

-   Confirm the backend is running on port `3001`.
-   Check `frontend/.env` contains `VITE_API_URL=http://localhost:3001`.
-   Confirm NestJS CORS allows `http://localhost:5173`.
-   Restart Vite after changing `.env`.

### Ollama connection errors

-   Confirm Ollama is installed and running.
-   Run `ollama list` and verify `qwen3:4b` is available.
-   Check that Ollama responds at `http://localhost:11434`.

### The response is not streaming

-   Make sure the frontend calls `/chat/stream`, not `/chat`.
-   Make sure the backend calls `ollama.chat()` with `stream: true`.
-   Test the endpoint with the `curl --no-buffer` command above.
-   A reverse proxy can buffer streamed responses; the current local
    development setup should not need one.

### Markdown or code highlighting does not render

-   Verify `react-markdown`, `remark-gfm`, and
    `react-syntax-highlighter` are installed in `frontend`.
-   Check that assistant messages are rendered through the
    `ReactMarkdown` component.
-   Ensure code fences include a language, such as
    ```` ```typescript ````.

## Roadmap

-   [ ] Upload PDF documents.
-   [ ] Extract text and metadata from PDFs.
-   [ ] Split documents into overlapping chunks.
-   [ ] Generate embeddings with `qwen3-embedding:0.6b`.
-   [ ] Store and search embeddings in a vector store.
-   [ ] Retrieve relevant chunks and use them as context for answers
    (RAG).
-   [ ] Include source citations in answers.
-   [ ] Add stream cancellation and improved error handling.
-   [ ] Add automated tests and configuration validation.

## Project status

This is an actively developed portfolio and learning project. The
current milestone is a working local AI chat application with streamed
output and rich Markdown rendering. Document-grounded RAG functionality
is a planned milestone, not a current feature.

## License

No license has been specified yet. Add a `LICENSE` file before
distributing the project for reuse.
