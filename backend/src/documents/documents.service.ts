// src/documents/documents.service.ts

import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { extname } from 'node:path';
import * as mammoth from 'mammoth';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import type {
  ExtractedDocument,
  ExtractedDocumentSection,
} from '@/documents/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  async extract(
    file: Express.Multer.File,
    signal?: AbortSignal,
  ): Promise<ExtractedDocument | undefined> {
    if (!file) {
      throw new BadRequestException('A document file is required.');
    }

    if (signal?.aborted) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('The document must not exceed 10 MB.');
    }

    const extension = extname(file.originalname).toLowerCase();

    switch (extension) {
      case '.pdf':
        return this.extractPdf(file, signal);

      case '.docx':
        return this.extractDocx(file, signal);

      case '.txt':
        return this.extractText(file, 'txt', signal);

      case '.md':
        return this.extractMarkdown(file, signal);

      case '.csv':
        return this.extractSpreadsheet(file, 'csv', signal);

      case '.xls':
        return this.extractSpreadsheet(file, 'xls', signal);

      case '.xlsx':
        return this.extractSpreadsheet(file, 'xlsx', signal);

      default:
        throw new BadRequestException(
          'Unsupported file type. Upload a PDF, DOCX, TXT, MD, CSV, XLS, or XLSX file.',
        );
    }
  }

  // Extracts text and structure from PDF files
  private async extractPdf(
    file: Express.Multer.File,
    signal?: AbortSignal,
  ): Promise<ExtractedDocument | undefined> {
    if (file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new BadRequestException('The uploaded file is not a valid PDF.');
    }

    const pages: ExtractedDocumentSection[] = [];

    try {
      const result = await pdf(file.buffer, {
        pagerender: async (pageData) => {
          if (signal?.aborted) {
            return '';
          }

          const content = await pageData.getTextContent();

          const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .trim();

          pages.push({
            pageNumber: pageData.pageIndex + 1,
            text: pageText,
          });

          return pageText;
        },
      });

      if (signal?.aborted) {
        return;
      }

      return {
        filename: file.originalname,
        type: 'pdf',
        pageCount: result.numpages,
        sections: pages.sort(
          (a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0),
        ),
      };
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      console.error('PDF extraction failed:', error);

      throw new BadRequestException(
        'Could not read this PDF. The file may be corrupted or unsupported.',
      );
    }
  }

  // Extracts text from DOCX files
  private async extractDocx(
    file: Express.Multer.File,
    signal?: AbortSignal,
  ): Promise<ExtractedDocument | undefined> {
    // DOCX is a ZIP-based Office document.
    if (
      file.buffer.length < 4 ||
      file.buffer[0] !== 0x50 ||
      file.buffer[1] !== 0x4b
    ) {
      throw new BadRequestException(
        'The uploaded file is not a valid DOCX document.',
      );
    }

    try {
      const result = await mammoth.extractRawText({
        buffer: file.buffer,
      });

      if (signal?.aborted) {
        return;
      }

      return {
        filename: file.originalname,
        type: 'docx',
        sections: [{ text: result.value.trim() }],
      };
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      console.error('DOCX extraction failed:', error);

      throw new BadRequestException(
        'Could not read this DOCX document. The file may be corrupted or unsupported.',
      );
    }
  }

  // Extracts text from plain text files (TXT)
  private extractText(
    file: Express.Multer.File,
    type: 'txt',
    signal?: AbortSignal,
  ): ExtractedDocument | undefined {
    if (signal?.aborted) {
      return;
    }

    const text = this.decodeTextFile(file);

    return {
      filename: file.originalname,
      type,
      sections: [{ text }],
    };
  }

  // Extracts text and structure from Markdown files, preserving headings as section metadata
  private extractMarkdown(
    file: Express.Multer.File,
    signal?: AbortSignal,
  ): ExtractedDocument | undefined {
    if (signal?.aborted) {
      return;
    }

    const text = this.decodeTextFile(file);
    const sections: ExtractedDocumentSection[] = [];

    // Keep Markdown headings as section metadata for retrieval and citations.
    const lines = text.split(/\r?\n/);
    let heading: string | undefined;
    let currentLines: string[] = [];

    const flushSection = () => {
      const sectionText = currentLines.join('\n').trim();

      if (sectionText) {
        sections.push({
          text: sectionText,
          ...(heading ? { heading } : {}),
        });
      }

      currentLines = [];
    };

    for (const line of lines) {
      const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);

      if (match) {
        flushSection();
        heading = match[1].trim();
        currentLines.push(line);
      } else {
        currentLines.push(line);
      }
    }

    flushSection();

    return {
      filename: file.originalname,
      type: 'md',
      sections,
    };
  }

  /**
   * Extracts text and structure from spreadsheet files (CSV, XLS, XLSX).
   * Returns an ExtractedDocument with sections corresponding to each sheet.
   */
  private extractSpreadsheet(
    file: Express.Multer.File,
    type: 'csv' | 'xls' | 'xlsx',
    signal?: AbortSignal,
  ): ExtractedDocument | undefined {
    if (signal?.aborted) {
      return;
    }

    // Validate the basic file signature for Excel formats.
    if (type === 'xlsx') {
      const isZip =
        file.buffer.length >= 4 &&
        file.buffer[0] === 0x50 &&
        file.buffer[1] === 0x4b;

      if (!isZip) {
        throw new BadRequestException(
          'The uploaded file is not a valid XLSX document.',
        );
      }
    }

    if (type === 'xls') {
      const oleSignature = Buffer.from([
        0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
      ]);

      if (
        file.buffer.length < 8 ||
        !file.buffer.subarray(0, 8).equals(oleSignature)
      ) {
        throw new BadRequestException(
          'The uploaded file is not a valid XLS document.',
        );
      }
    }

    try {
      const workbook = XLSX.read(file.buffer, {
        type: 'buffer',
        raw: false,
        codepage: 65001,
      });

      if (signal?.aborted) {
        return;
      }

      const sections: ExtractedDocumentSection[] = [];

      for (const sheetName of workbook.SheetNames) {
        if (signal?.aborted) {
          return;
        }

        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          continue;
        }

        const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
          defval: '',
          raw: false,
          blankrows: false,
        });

        // Find the first non-empty row to use as the column headers.
        const headerIndex = matrix.findIndex((row) =>
          row.some((cell) => String(cell ?? '').trim() !== ''),
        );

        if (headerIndex === -1) {
          continue;
        }

        const rawHeaders = matrix[headerIndex];

        const columns = rawHeaders.map((cell, index) => {
          const value = String(cell ?? '').trim();
          return value || `Column ${index + 1}`;
        });

        const rows = matrix
          .slice(headerIndex + 1)
          .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
          .map((row) =>
            columns
              .map((column, index) => {
                const value = String(row[index] ?? '').trim();

                return value ? `${column}: ${value}` : `${column}: (empty)`;
              })
              .join(' | '),
          );

        if (rows.length === 0) {
          continue;
        }

        sections.push({
          sheetName,
          columns,
          rows,
          text: rows.join('\n'),
        });
      }

      if (signal?.aborted) {
        return;
      }

      if (sections.length === 0) {
        throw new BadRequestException(
          'The spreadsheet does not contain any tabular data.',
        );
      }

      return {
        filename: file.originalname,
        type,
        sections,
      };
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Spreadsheet extraction failed:', error);

      throw new BadRequestException(
        'Could not read this spreadsheet. The file may be corrupted or unsupported.',
      );
    }
  }

  // Decodes the content of a text file, ensuring it is valid and non-empty
  private decodeTextFile(file: Express.Multer.File): string {
    const text = file.buffer.toString('utf8');

    // Reject obvious binary content disguised as a text file.
    if (text.includes('\u0000')) {
      throw new BadRequestException(
        'The uploaded file does not appear to be a valid text document.',
      );
    }

    const normalizedText = text.replace(/^\uFEFF/, '').trim();

    if (!normalizedText) {
      throw new BadRequestException(
        'The uploaded document does not contain any text.',
      );
    }

    return normalizedText;
  }
}
