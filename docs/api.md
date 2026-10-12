# API

The backend normally runs at `http://localhost:3001`.

## `POST /chat`

Generates a complete response as JSON.

```json
{
  "message": "Explain RAG in simple terms."
}
```

Response:

```json
{
  "answer": "RAG stands for Retrieval-Augmented Generation..."
}
```

## `POST /chat/stream`

Streams generated text as a plain response body. The stream is not Server-Sent Events and does not define structured event types.

```bash
curl --no-buffer \
  -X POST http://localhost:3001/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain RAG in simple terms."}'
```

## `POST /documents/upload`

Uploads one document, extracts its content, chunks it, generates embeddings, and persists it.

```bash
curl -X POST http://localhost:3001/documents/upload \
  -F "file=@./employees.csv"
```

Successful response:

```json
{
  "documentId": "generated-document-uuid",
  "filename": "employees.csv",
  "type": "csv",
  "chunkCount": 3
}
```

Upload constraints:

- Maximum size: 10 MB.
- One file per request.
- Supported extensions: PDF, DOCX, TXT, Markdown, CSV, XLS, and XLSX.
- Empty documents without extractable content are rejected.

## `GET /documents`

Returns persisted document metadata, ordered newest first.

```json
[
  {
    "documentId": "generated-document-uuid",
    "filename": "employees.csv",
    "type": "csv",
    "createdAt": "2026-10-12T10:00:00.000Z"
  }
]
```

This endpoint does not return extracted text or embeddings.

## `POST /documents/search`

Runs semantic similarity search against stored chunks. `documentId` is optional.

```json
{
  "query": "How many hours does Maria work?",
  "documentId": "generated-document-uuid"
}
```

The endpoint returns up to five results with document metadata, extracted text, chunk indexes, and similarity scores.

## `POST /documents/ask`

Uses retrieved chunks as context for the chat model. `documentId` is optional; when supplied, retrieval is limited to that document.

```json
{
  "query": "How many hours does Maria work?",
  "documentId": "generated-document-uuid"
}
```

Example response:

```json
{
  "answer": "The document indicates that Maria works ... [Source 1]",
  "citations": [
    {
      "source": 1,
      "documentId": "generated-document-uuid",
      "filename": "employees.csv",
      "sheetName": "Employees",
      "score": 0.7241
    }
  ]
}
```

Citation metadata is conditional. Page numbers, worksheet names, and headings appear when the source chunk provides them. The RAG endpoint retrieves up to three relevant chunks and returns a complete JSON response rather than streaming tokens.

Similarity scores indicate embedding similarity and do not guarantee a correct or complete answer.
