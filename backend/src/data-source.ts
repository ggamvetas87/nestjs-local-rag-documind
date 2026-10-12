// src/data-source.ts

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { DocumentEntity } from '@/documents/entities/document.entity';
import { DocumentChunkEntity } from '@/documents/entities/document-chunk.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USER ?? 'documind',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? 'documindDB',

  entities: [DocumentEntity, DocumentChunkEntity],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
