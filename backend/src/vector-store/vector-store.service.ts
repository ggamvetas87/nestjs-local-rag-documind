import { Injectable } from '@nestjs/common';
import type { DocumentChunk } from '@/documents/document-chunking.service';

export interface StoredDocumentChunk extends DocumentChunk {
  documentId: string;
  embedding: number[];
}

export interface SearchResult extends StoredDocumentChunk {
  score: number;
}

@Injectable()
export class VectorStoreService {
  private readonly documents = new Map<string, StoredDocumentChunk[]>();

  // Adds a new document along with its chunks and embeddings to the vector store
  addDocument(
    documentId: string,
    chunks: Array<DocumentChunk & { embedding: number[] }>,
  ): void {
    const storedChunks: StoredDocumentChunk[] = chunks.map((chunk) => ({
      ...chunk,
      documentId,
    }));

    this.documents.set(documentId, storedChunks);
  }

  // Searches for the most similar document chunks based on the query embedding
  search(
    queryEmbedding: number[],
    options: { documentId?: string; topK?: number } = {},
  ): SearchResult[] {
    const { documentId, topK = 5 } = options;

    if (queryEmbedding.length === 0) {
      throw new Error('Query embedding cannot be empty.');
    }

    const chunks = documentId
      ? (this.documents.get(documentId) ?? [])
      : Array.from(this.documents.values()).flat();

    return chunks
      .map((chunk) => ({
        ...chunk,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, topK));
  }

  deleteDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  // Computes the cosine similarity between two vectors.
  // Returns a value between -1 and 1, where:
  // [+] 1 indicates identical direction
  // [+] 0 indicates orthogonality
  // [+] -1 indicates opposite direction.
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions do not match.');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] ** 2;
      magnitudeB += b[i] ** 2;
    }

    const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }
}
