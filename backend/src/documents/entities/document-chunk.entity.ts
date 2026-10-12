// src/documents/entities/document-chunk.entity.ts

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentEntity } from '@/documents/entities/document.entity';

@Entity({ name: 'document_chunks' })
@Index('idx_document_chunks_document_id', ['documentId'])
export class DocumentChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'document_id',
    type: 'uuid',
  })
  documentId!: string;

  @ManyToOne(() => DocumentEntity, (document) => document.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentEntity;

  @Column({
    name: 'chunk_index',
    type: 'integer',
  })
  chunkIndex!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({
    type: 'vector',
    length: 1024,
  })
  embedding!: number[];

  @Column({
    name: 'page_number',
    type: 'integer',
    nullable: true,
  })
  pageNumber?: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  heading?: string;

  @Column({
    name: 'sheet_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sheetName?: string;
}
