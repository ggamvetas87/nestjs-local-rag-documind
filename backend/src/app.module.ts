import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ChatModule } from '@/chat/chat.module';
import { DocumentsModule } from '@/documents/documents.module';
import { EmbeddingsModule } from '@/embeddings/embeddings.module';

@Module({
  imports: [ChatModule, DocumentsModule, EmbeddingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
