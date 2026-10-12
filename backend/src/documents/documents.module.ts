import { Module } from '@nestjs/common';
import { DocumentsController } from '@/documents/documents.controller';
import { DocumentsService } from '@/documents/documents.service';
import { DocumentChunkingService } from '@/documents/document-chunking.service';
import { EmbeddingsModule } from '@/embeddings/embeddings.module';
import { VectorStoreModule } from '@/vector-store/vector-store.module';
import { RagService } from '@/documents/rag.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '@/documents/entities/document.entity';
import { DocumentChunkEntity } from '@/documents/entities/document-chunk.entity';

@Module({
  controllers: [DocumentsController],
  imports: [
    EmbeddingsModule,
    VectorStoreModule,
    TypeOrmModule.forFeature([DocumentEntity, DocumentChunkEntity]),
  ],
  providers: [DocumentsService, DocumentChunkingService, RagService],
  exports: [DocumentChunkingService, RagService],
})
export class DocumentsModule {}
