
import { useState, useRef } from "react";
import type { ExtractedPdfDocument } from "@/components/documents/types";
import "@/components/documents/Documents.css";

interface DocumentUploadModalProps {
  onClose: () => void;
  onUploaded: (document: ExtractedPdfDocument) => void;
}

const API_URL = import.meta.env.VITE_API_URL;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function DocumentUploadModal({
  onClose,
  onUploaded,
}: Readonly<DocumentUploadModalProps>) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleResetFile() {
    setFile(null);
    setError("");

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  function handleFileChange(selectedFile?: File) {
    setError("");
    setFile(null);

    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("The PDF must not exceed 10 MB.");
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file || isUploading) return;

    setError("");
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
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;

        throw new Error(
          message ?? `Upload failed (${response.status}).`,
        );
      }

      const document: ExtractedPdfDocument =
        await response.json();

      onUploaded(document);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload the PDF.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      className="document-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isUploading
        ) {
          onClose();
        }
      }}
    >
      <section
        className="document-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-modal-title"
      >
        <header className="document-modal-header">
          <div>
            <h2 id="document-modal-title">Add a document</h2>
            <p>Upload a PDF to DocuMind.</p>
          </div>

          <button
            type="button"
            className="document-modal-close"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <label className="document-dropzone">
          <span className="document-upload-icon">↑</span>
          <strong>
            {file ? file.name : "Choose a PDF file"}
          </strong>
          <span>PDF files up to 10 MB</span>

          <input
            type="file"
            accept=".pdf,application/pdf"
            disabled={isUploading}
            onChange={(event) =>
              handleFileChange(event.target.files?.[0])
            }
            ref={fileInputRef}
          />
        </label>

        {error && (
          <p className="document-upload-error" role="alert">
            {error}
          </p>
        )}

        <footer className="document-modal-actions">
            <div>
                <button
                    type="button"
                    className="document-button-secondary"
                    onClick={onClose}
                    disabled={isUploading}
                >
                    Cancel
                </button>
                {file && (
                    <div className="selected-file">
                        <span>{file.name}</span>

                        <button
                            type="button"
                            onClick={handleResetFile}
                            disabled={isUploading}
                        >
                            Remove
                        </button>
                    </div>
                )}
            </div>

          <button
            type="button"
            className="document-button-primary"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Extracting..." : "Upload & Extract"}
          </button>
        </footer>
      </section>
    </div>
  );
}
