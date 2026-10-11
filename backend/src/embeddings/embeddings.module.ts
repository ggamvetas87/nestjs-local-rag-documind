import { Module } from '@nestjs/common';
import { EmbeddingsService } from '@/embeddings/embeddings.service';

@Module({
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
