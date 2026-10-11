
export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedPdfDocument = {
  filename: string;
  pageCount: number;
  text: string;
  pages: ExtractedPdfPage[];
};

export type UploadedPdfDocument = {
  documentId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
};
