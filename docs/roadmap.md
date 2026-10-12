# Roadmap

## Completed

- Local chat using Ollama.
- Streaming chat responses.
- Markdown rendering and syntax highlighting.
- Upload and validation for supported document formats.
- Document text extraction and applicable metadata.
- Overlapping document chunks.
- Local document embeddings.
- PostgreSQL and pgvector persistence.
- Semantic similarity search.
- Document restoration after frontend refresh.
- Context-grounded RAG answers.
- Source metadata and citations.
- Document-grounded questions in the React UI.

## Planned

- Improve citation presentation in chat messages.
- Add streaming responses to the RAG endpoint.
- Add persistent chat history and conversations.
- Implement document deletion and re-indexing through the API and UI.
- Add automated tests for extraction, chunking, embeddings, retrieval, and RAG.
- Improve request validation and configuration handling.
- Evaluate retrieval quality and tune chunking and relevance thresholds.
- Explore approximate-nearest-neighbor indexing for larger collections.
- Improve scanned PDF and complex document layout handling.

## Known Limitations

- Chat and embeddings require Ollama and the required local models.
- Scanned PDFs may not produce useful text because OCR is not implemented.
- Similarity scores do not guarantee answer correctness.
- Search has no configurable relevance threshold.
- `/documents/ask` returns complete JSON rather than streamed tokens.
- Chat history is not persisted.
- The frontend document removal control does not delete the database record.
- There is no automated retrieval-quality evaluation pipeline.
