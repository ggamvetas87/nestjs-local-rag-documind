import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { extname } from 'node:path';
import * as mammoth from 'mammoth';
import pdf from 'pdf-parse';
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

      default:
        throw new BadRequestException(
          'Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.',
        );
    }
  }

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
