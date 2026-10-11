import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from '@/documents/documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
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

      if (abortController.signal.aborted || res.destroyed) {
        return;
      }

      res.status(HttpStatus.OK).json(document);
    } catch (error) {
      if (abortController.signal.aborted || res.destroyed) {
        return;
      }

      throw error;
    }
  }
}
