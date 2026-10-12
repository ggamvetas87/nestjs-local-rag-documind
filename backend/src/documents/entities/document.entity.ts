// src/documents/entities/document.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import type { DocumentType } from '@/documents/types';
import { DocumentChunkEntity } from '@/documents/entities/document-chunk.entity';

@Entity({ name: 'documents' })
export class DocumentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: DocumentType;

  @Column({
    name: 'page_count',
    type: 'integer',
    nullable: true,
  })
  pageCount?: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @OneToMany(() => DocumentChunkEntity, (chunk) => chunk.document)
  chunks!: DocumentChunkEntity[];
}
