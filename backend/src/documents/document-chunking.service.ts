import { Injectable } from '@nestjs/common';
import type { DocumentType, ExtractedDocument } from '@/documents/types';

export interface DocumentChunk {
  filename: string;
  type: DocumentType;
  chunkIndex: number;
  text: string;
  pageNumber?: number;
  heading?: string;
}

@Injectable()
export class DocumentChunkingService {
  private readonly chunkSize = 1_000;
  private readonly chunkOverlap = 150;

  // Splits an extracted document into smaller chunks
  // for easier processing and retrieval
  chunkDocument(document: ExtractedDocument): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (const section of document.sections) {
      const text = section.text.trim();

      if (!text) {
        continue;
      }

      let start = 0;
      let chunkIndex = 0;

      while (start < text.length) {
        let end = Math.min(start + this.chunkSize, text.length);

        // Prefer ending at a word boundary when possible.
        if (end < text.length) {
          const minimumEnd = start + Math.floor(this.chunkSize * 0.8);
          const lastSpace = text.lastIndexOf(' ', end);

          if (lastSpace > minimumEnd) {
            end = lastSpace;
          }
        }

        const chunkText = text.slice(start, end).trim();

        if (chunkText) {
          chunks.push({
            filename: document.filename,
            type: document.type,
            chunkIndex,
            text: chunkText,
            ...(section.pageNumber !== undefined
              ? { pageNumber: section.pageNumber }
              : {}),
            ...(section.heading ? { heading: section.heading } : {}),
          });

          chunkIndex++;
        }

        if (end >= text.length) {
          break;
        }

        // Keep overlapping text between consecutive chunks.
        start = Math.max(end - this.chunkOverlap, start + 1);
      }
    }

    return chunks;
  }
}
