import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1760270000000 implements MigrationInterface {
  name = 'CreateDocuments1760270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL,
        "filename" varchar(255) NOT NULL,
        "type" varchar(10) NOT NULL,
        "page_count" integer,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "document_chunks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "document_id" uuid NOT NULL,
        "chunk_index" integer NOT NULL,
        "text" text NOT NULL,
        "embedding" vector(1024) NOT NULL,
        "page_number" integer,
        "heading" varchar(255),
        "sheet_name" varchar(255),
        CONSTRAINT "PK_document_chunks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_chunks_document_id"
          FOREIGN KEY ("document_id")
          REFERENCES "documents"("id")
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_document_chunks_document_id"
      ON "document_chunks" ("document_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "document_chunks";
    `);

    await queryRunner.query(`
      DROP TABLE "documents";
    `);
  }
}
