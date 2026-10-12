// src/documents/documents.controller.ts

import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { extname } from 'node:path';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from '@/documents/documents.service';
import { DocumentChunkingService } from '@/documents/document-chunking.service';
import { EmbeddingsService } from '@/embeddings/embeddings.service';
import { VectorStoreService } from '@/vector-store/vector-store.service';
import { RagService } from '@/documents/rag.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentChunkingService: DocumentChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly ragService: RagService,
  ) {}

  // Lists all documents in the database, ordered by creation date in descending order
  @Get()
  async getDocuments() {
    const documents = await this.vectorStoreService.listDocuments();

    return documents.map((document) => ({
      documentId: document.id,
      filename: document.filename,
      type: document.type,
      ...(document.pageCount !== null && document.pageCount !== undefined
        ? { pageCount: document.pageCount }
        : {}),
      createdAt: document.createdAt,
    }));
  }

  // Handles PDF file uploads, extracts text, chunks the document,
  // generates embeddings, and stores them in the vector store
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedExtensions = new Set([
          '.pdf',
          '.docx',
          '.txt',
          '.md',
          '.csv',
          '.xls',
          '.xlsx',
        ]);

        if (!allowedExtensions.has(extension)) {
          return callback(
            new BadRequestException('Unsupported document file type.'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadDocument(
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
      const document = await this.documentsService.extract(
        file,
        abortController.signal,
      );

      if (!document || abortController.signal.aborted || res.destroyed) {
        return;
      }

      const chunks = this.documentChunkingService.chunkDocument(document);

      if (chunks.length === 0) {
        throw new BadRequestException(
          'No extractable text was found in the uploaded document.',
        );
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

      // Add the document and its chunks to the vector store
      await this.vectorStoreService.addDocument(
        documentId,
        chunksWithEmbeddings,
        {
          filename: document.filename,
          type: document.type,
          ...(document.pageCount !== undefined
            ? { pageCount: document.pageCount }
            : {}),
        },
      );

      res.status(HttpStatus.OK).json({
        documentId,
        filename: document.filename,
        type: document.type,
        ...(document.pageCount !== undefined
          ? { pageCount: document.pageCount }
          : {}),
        chunkCount: chunksWithEmbeddings.length,
      });
    } catch (error) {
      if (abortController.signal.aborted || res.destroyed) {
        return;
      }

      throw error;
    }
  }

  // Handles search requests by generating an embedding for the query
  // and retrieving the most similar document chunks from the vector store
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchDocuments(@Body() body: { query?: string; documentId?: string }) {
    const query = body?.query?.trim();

    if (!query) {
      throw new BadRequestException('A search query is required.');
    }

    const queryEmbedding =
      await this.embeddingsService.generateEmbedding(query);

    // Perform the search in the vector store using the generated query embedding
    const results = await this.vectorStoreService.search(queryEmbedding, {
      documentId: body.documentId,
      topK: 5,
    });

    return {
      query,
      resultCount: results.length,
      results: results.map((result) => ({
        documentId: result.documentId,
        filename: result.filename,
        type: result.type,
        ...(result.pageNumber !== undefined
          ? { pageNumber: result.pageNumber }
          : {}),
        ...(result.heading ? { heading: result.heading } : {}),
        chunkIndex: result.chunkIndex,
        text: result.text,
        score: Number(result.score.toFixed(4)),
      })),
    };
  }

  // Handles question-answering requests by using the RAG service to retrieve context from the vector store
  // and generate an answer with the local LLM
  @Post('ask')
  @HttpCode(HttpStatus.OK)
  async askDocument(@Body() body: { query?: string; documentId?: string }) {
    if (!body?.query?.trim()) {
      throw new BadRequestException('A question is required.');
    }

    return this.ragService.ask(body.query, body.documentId);
  }
}
