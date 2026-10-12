// src/documents/types.ts
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'md';

export type ExtractedDocumentSection = {
  text: string;
  pageNumber?: number;
  heading?: string;
};

export type ExtractedDocument = {
  filename: string;
  type: DocumentType;
  sections: ExtractedDocumentSection[];
  pageCount?: number;
};
