import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import pdf from 'pdf-parse';
import type { Express } from 'express';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

@Injectable()
export class DocumentsService {
  async extractPdf(file: Express.Multer.File, signal?: AbortSignal) {
    if (!file) {
      throw new BadRequestException('A PDF file is required.');
    }

    if (signal?.aborted) {
      return;
    }

    // Verify the PDF signature; MIME type alone is not sufficient.
    if (file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new BadRequestException('The uploaded file is not a valid PDF.');
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new PayloadTooLargeException('The PDF must not exceed 10 MB.');
    }

    const pages: ExtractedPdfPage[] = [];

    try {
      const result = await pdf(file.buffer, {
        pagerender: async (pageData) => {
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

      return {
        filename: file.originalname,
        pageCount: result.numpages,
        text: result.text,
        pages: pages.sort((a, b) => a.pageNumber - b.pageNumber),
      };
    } catch (error) {
      console.error('PDF extraction failed:', error);

      throw new BadRequestException(
        'Could not read this PDF. The file may be corrupted or unsupported.',
      );
    }
  }
}
