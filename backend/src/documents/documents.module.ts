import { Module } from '@nestjs/common';
import { DocumentsController } from '@/documents/documents.controller';
import { DocumentsService } from '@/documents/documents.service';
import { DocumentChunkingService } from '@/documents/document-chunking.service';
import { EmbeddingsModule } from '@/embeddings/embeddings.module';
import { VectorStoreModule } from '@/vector-store/vector-store.module';

@Module({
  controllers: [DocumentsController],
  imports: [EmbeddingsModule, VectorStoreModule],
  providers: [DocumentsService, DocumentChunkingService],
  exports: [DocumentChunkingService],
})
export class DocumentsModule {}
