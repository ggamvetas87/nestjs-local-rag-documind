# Troubleshooting

## Frontend Cannot Reach Backend

- Confirm NestJS is running on port `3001`.
- Check `frontend/.env` contains `VITE_API_URL=http://localhost:3001`.
- Confirm CORS allows `http://localhost:5173`.
- Restart Vite after changing environment variables.

## PostgreSQL Connection Errors

- Confirm the PostgreSQL container is running.
- Verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- Confirm host port `5433` maps to container port `5432`.
- Check backend logs for TypeORM connection errors.

## Migration Errors

- Confirm the configured database is accessible.
- Ensure the database user can create tables and enable pgvector.
- Run `yarn migration:run` from `backend/`.
- Review migration history before rerunning or reverting migrations.

## Ollama Errors

- Confirm Ollama is running.
- Run `ollama list` and verify `qwen3:4b` and `qwen3-embedding:0.6b` are installed.
- Confirm Ollama responds at `http://localhost:11434`.

## Document Upload Fails

- Verify the extension is supported and the file is no larger than 10 MB.
- Check backend logs for extraction, embedding, and database errors.
- Ensure the embedding model is available in Ollama.
- Empty documents and unsupported or invalid file signatures are rejected.

## Saved Documents Do Not Appear

- Confirm `GET /documents` returns the saved records.
- Check that the frontend requests the endpoint when the app mounts.
- Verify the response maps the database ID to `documentId`.
- Ensure the PostgreSQL persistent volume has not been recreated or cleared.

## Search Returns No Results

- Confirm the document uploaded successfully.
- Check that the requested `documentId` is correct.
- Verify the document has rows in `document_chunks`.
- Ensure query and document embeddings use the same model and dimensions.

## RAG Answers Are Incomplete

- Ask a more specific question.
- Inspect `POST /documents/search` to see which chunks were retrieved.
- Review source metadata and similarity scores.
- Remember that retrieval and generation are separate stages.

## Streaming Does Not Work

- Confirm the frontend calls `/chat/stream`, not `/chat`.
- Test the endpoint with `curl --no-buffer` as shown in [api.md](api.md).
- Check whether a proxy is buffering the response.

## Markdown or Code Highlighting Fails

- Verify `react-markdown`, `remark-gfm`, and `react-syntax-highlighter` are installed.
- Confirm assistant messages are rendered with `ReactMarkdown`.
- Use a language identifier in fenced code blocks, such as `typescript`.
