// src/documents/document-chunking.service.ts

import { Injectable } from '@nestjs/common';
import type { DocumentType, ExtractedDocument } from '@/documents/types';

export interface DocumentChunk {
  filename: string;
  type: DocumentType;
  chunkIndex: number;
  text: string;
  pageNumber?: number;
  heading?: string;
  sheetName?: string;
}

@Injectable()
export class DocumentChunkingService {
  private readonly chunkSize = 1_000;
  private readonly chunkOverlap = 150;

  // Splits an extracted document into smaller chunks for easier processing and retrieval
  chunkDocument(document: ExtractedDocument): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let nextChunkIndex = 0;

    for (const section of document.sections) {
      if (section.rows && section.columns && section.sheetName) {
        const prefix = [
          `Worksheet: ${section.sheetName}`,
          `Columns: ${section.columns.join(' | ')}`,
          '',
        ].join('\n');

        let currentRows: string[] = [];

        const flushRows = () => {
          if (currentRows.length === 0) {
            return;
          }

          chunks.push({
            filename: document.filename,
            type: document.type,
            chunkIndex: nextChunkIndex++,
            sheetName: section.sheetName,
            text: `${prefix}${currentRows.join('\n')}`,
          });

          currentRows = [];
        };

        for (const row of section.rows) {
          const candidate = [...currentRows, row];
          const candidateText = `${prefix}${candidate.join('\n')}`;

          if (currentRows.length > 0 && candidateText.length > this.chunkSize) {
            flushRows();
          }

          currentRows.push(row);
        }

        flushRows();
        continue;
      }

      const text = section.text.trim();

      if (!text) {
        continue;
      }

      let start = 0;

      while (start < text.length) {
        let end = Math.min(start + this.chunkSize, text.length);

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
            chunkIndex: nextChunkIndex++,
            text: chunkText,
            ...(section.pageNumber !== undefined
              ? { pageNumber: section.pageNumber }
              : {}),
            ...(section.heading ? { heading: section.heading } : {}),
            ...(section.sheetName ? { sheetName: section.sheetName } : {}),
          });
        }

        if (end >= text.length) {
          break;
        }

        start = Math.max(end - this.chunkOverlap, start + 1);
      }
    }

    return chunks;
  }
}
