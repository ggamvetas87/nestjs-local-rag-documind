// src/documents/types.ts
export type DocumentType =
  'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'xls' | 'xlsx';

export type ExtractedDocumentSection = {
  text: string;
  pageNumber?: number;
  heading?: string;
  sheetName?: string;
  columns?: string[];
  rows?: string[];
};

export type ExtractedDocument = {
  filename: string;
  type: DocumentType;
  sections: ExtractedDocumentSection[];
  pageCount?: number;
};

export type ExtractedDocumentSectionWithSheetName = {
  text: string;
  pageNumber?: number;
  heading?: string;
  sheetName?: string;
};
