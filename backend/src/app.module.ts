// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ChatModule } from '@/chat/chat.module';
import { DocumentsModule } from '@/documents/documents.module';
import { EmbeddingsModule } from '@/embeddings/embeddings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get('DB_PORT') ?? 5433),
        username: configService.get<string>('DB_USER', 'documind'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME', 'documindDB'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    ChatModule,
    DocumentsModule,
    EmbeddingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
