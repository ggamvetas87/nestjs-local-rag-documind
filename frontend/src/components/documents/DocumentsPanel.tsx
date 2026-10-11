
import { useState } from "react";
import "@/components/documents/DocumentsPanel.css";

interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

interface ExtractedPdfDocument {
  filename: string;
  pageCount: number;
  text: string;
  pages: ExtractedPdfPage[];
}

const API_URL = import.meta.env.VITE_API_URL;

export default function DocumentsPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] =
    useState<ExtractedPdfDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setError("");
    setDocument(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/documents/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.message ??
            `Upload failed (${response.status}).`,
        );
      }

      const result: ExtractedPdfDocument =
        await response.json();

      setDocument(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading the PDF.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="documents-panel">
      <div className="documents-header">
        <div>
          <h2>Documents</h2>
          <p>Upload a PDF and extract its text.</p>
        </div>
      </div>

      <div className="documents-upload">
        <label htmlFor="pdf-upload">
          Select a PDF
        </label>

        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setDocument(null);
            setError("");
          }}
        />

        {file && (
          <p className="selected-file">
            Selected: {file.name}
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? "Extracting..." : "Upload & Extract"}
        </button>
      </div>

      {error && (
        <p className="documents-error" role="alert">
          {error}
        </p>
      )}

      {document && (
        <div className="document-result">
          <div className="document-summary">
            <h3>{document.filename}</h3>
            <span>
              {document.pageCount}{" "}
              {document.pageCount === 1 ? "page" : "pages"}
            </span>
          </div>

          <h3>Extracted text</h3>
          <pre className="extracted-text">
            {document.text}
          </pre>

          <h3>Pages</h3>
          <div className="document-pages">
            {document.pages.map((page) => (
              <details key={page.pageNumber}>
                <summary>Page {page.pageNumber}</summary>
                <p>{page.text || "No text found on this page."}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
