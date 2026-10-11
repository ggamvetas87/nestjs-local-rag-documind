import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from '@/documents/documents.service';
import { DocumentChunkingService } from '@/documents/document-chunking.service';
import { EmbeddingsService } from '@/embeddings/embeddings.service';
import { VectorStoreService } from '@/vector-store/vector-store.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentChunkingService: DocumentChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new BadRequestException('Only PDF files are allowed.'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ): Promise<void> {
    const abortController = new AbortController();

    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    try {
      const document = await this.documentsService.extractPdf(
        file,
        abortController.signal,
      );

      if (!document || abortController.signal.aborted || res.destroyed) {
        return;
      }

      const chunks = this.documentChunkingService.chunkPages(
        document.filename,
        document.pages,
      );

      if (abortController.signal.aborted || res.destroyed) {
        return;
      }

      const chunksWithEmbeddings: Array<
        (typeof chunks)[number] & { embedding: number[] }
      > = [];

      for (const chunk of chunks) {
        if (abortController.signal.aborted || res.destroyed) {
          return;
        }

        const embedding = await this.embeddingsService.generateEmbedding(
          chunk.text,
        );

        chunksWithEmbeddings.push({
          ...chunk,
          embedding,
        });
      }

      if (abortController.signal.aborted || res.destroyed) {
        return;
      }

      const documentId = randomUUID();

      this.vectorStoreService.addDocument(documentId, chunksWithEmbeddings);

      res.status(HttpStatus.OK).json({
        documentId,
        filename: document.filename,
        pageCount: document.pageCount,
        chunkCount: chunksWithEmbeddings.length,
      });
    } catch (error) {
      if (abortController.signal.aborted || res.destroyed) {
        return;
      }

      throw error;
    }
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchDocuments(@Body() body: { query?: string; documentId?: string }) {
    const query = body?.query?.trim();

    if (!query) {
      throw new BadRequestException('A search query is required.');
    }

    const queryEmbedding =
      await this.embeddingsService.generateEmbedding(query);

    const results = this.vectorStoreService.search(queryEmbedding, {
      documentId: body.documentId,
      topK: 5,
    });

    return {
      query,
      resultCount: results.length,
      results: results.map((result) => ({
        documentId: result.documentId,
        filename: result.filename,
        pageNumber: result.pageNumber,
        chunkIndex: result.chunkIndex,
        text: result.text,
        score: Number(result.score.toFixed(4)),
      })),
    };
  }
}
