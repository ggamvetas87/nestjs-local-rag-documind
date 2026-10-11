import { Injectable } from '@nestjs/common';
import type { ExtractedPdfPage } from '@/documents/documents.service';

export interface DocumentChunk {
  filename: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
}

@Injectable()
export class DocumentChunkingService {
  private readonly chunkSize = 1_000;
  private readonly chunkOverlap = 150;

  chunkPages(filename: string, pages: ExtractedPdfPage[]): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (const page of pages) {
      const text = page.text.trim();

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
            filename,
            pageNumber: page.pageNumber,
            chunkIndex,
            text: chunkText,
          });

          chunkIndex++;
        }

        if (end >= text.length) {
          break;
        }

        // Move forward while retaining some text from the previous chunk.
        start = Math.max(end - this.chunkOverlap, start + 1);
      }
    }

    return chunks;
  }
}
