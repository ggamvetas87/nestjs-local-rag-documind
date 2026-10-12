// src/vector-store/vector-store.service.ts

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocumentEntity } from '@/documents/entities/document.entity';
import { DocumentChunkEntity } from '@/documents/entities/document-chunk.entity';
import type { DocumentChunk } from '@/documents/document-chunking.service';
import type { DocumentType } from '@/documents/types';

export interface StoredDocumentChunk extends DocumentChunk {
  documentId: string;
  embedding: number[];
}

export interface SearchResult extends StoredDocumentChunk {
  score: number;
}

export interface DocumentMetadata {
  filename: string;
  type: DocumentType;
  pageCount?: number;
}

@Injectable()
export class VectorStoreService {
  constructor(private readonly dataSource: DataSource) {}

  // Persists a document and its chunks atomically.
  async addDocument(
    documentId: string,
    chunks: Array<DocumentChunk & { embedding: number[] }>,
    metadata?: DocumentMetadata,
  ): Promise<void> {
    const firstChunk = chunks[0];

    const documentMetadata =
      metadata ??
      (firstChunk
        ? {
            filename: firstChunk.filename,
            type: firstChunk.type,
          }
        : undefined);

    if (!documentMetadata) {
      throw new Error(
        'Document metadata is required when adding a document without chunks.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(DocumentEntity, {
        id: documentId,
        filename: documentMetadata.filename,
        type: documentMetadata.type,
        pageCount: documentMetadata.pageCount,
      });

      if (chunks.length === 0) {
        return;
      }

      await manager.insert(
        DocumentChunkEntity,
        chunks.map((chunk) => ({
          documentId,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          embedding: chunk.embedding,
          ...(chunk.pageNumber !== undefined
            ? { pageNumber: chunk.pageNumber }
            : {}),
          ...(chunk.heading !== undefined ? { heading: chunk.heading } : {}),
          ...(chunk.sheetName !== undefined
            ? { sheetName: chunk.sheetName }
            : {}),
        })),
      );
    });
  }

  // Searches PostgreSQL for the most similar document chunks.
  async search(
    queryEmbedding: number[],
    options: { documentId?: string; topK?: number } = {},
  ): Promise<SearchResult[]> {
    const { documentId, topK = 5 } = options;

    if (queryEmbedding.length === 0) {
      throw new Error('Query embedding cannot be empty.');
    }

    if (queryEmbedding.length !== 1024) {
      throw new Error('Query embedding must contain 1024 dimensions.');
    }

    const limit = Math.max(0, Math.floor(topK));

    if (limit === 0) {
      return [];
    }

    const rows: Array<{
      documentId: string;
      filename: string;
      type: DocumentType;
      chunkIndex: number;
      text: string;
      pageNumber: number | null;
      heading: string | null;
      sheetName: string | null;
      score: number | string;
    }> = await this.dataSource.query(
      `
        SELECT
          dc.document_id AS "documentId",
          d.filename AS "filename",
          d.type AS "type",
          dc.chunk_index AS "chunkIndex",
          dc.text AS "text",
          dc.page_number AS "pageNumber",
          dc.heading AS "heading",
          dc.sheet_name AS "sheetName",
          1 - (dc.embedding <=> $1::vector) AS "score"
        FROM document_chunks dc
        INNER JOIN documents d
          ON d.id = dc.document_id
        WHERE ($2::uuid IS NULL OR dc.document_id = $2::uuid)
        ORDER BY dc.embedding <=> $1::vector ASC
        LIMIT $3
      `,
      [JSON.stringify(queryEmbedding), documentId ?? null, limit],
    );

    return rows.map((row) => ({
      documentId: row.documentId,
      filename: row.filename,
      type: row.type,
      chunkIndex: row.chunkIndex,
      pageNumber: row.pageNumber ?? undefined,
      heading: row.heading ?? undefined,
      sheetName: row.sheetName ?? undefined,
      text: row.text,
      ...(row.pageNumber !== null ? { pageNumber: row.pageNumber } : {}),
      ...(row.heading !== null ? { heading: row.heading } : {}),
      ...(row.sheetName !== null ? { sheetName: row.sheetName } : {}),
      embedding: [],
      score: Number(row.score),
    }));
  }

  // Deletes the document; PostgreSQL cascades the deletion to its chunks.
  async deleteDocument(documentId: string): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(DocumentEntity)
      .delete(documentId);

    return (result.affected ?? 0) > 0;
  }

  // Lists all documents in the database, ordered by creation date in descending order
  async listDocuments(): Promise<DocumentEntity[]> {
    return this.dataSource.getRepository(DocumentEntity).find({
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
