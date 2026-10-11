import { Module } from '@nestjs/common';
import { DocumentsController } from '@/documents/documents.controller';
import { DocumentsService } from '@/documents/documents.service';
import { DocumentChunkingService } from '@/documents/document-chunking.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentChunkingService],
  exports: [DocumentChunkingService],
})
export class DocumentsModule {}
