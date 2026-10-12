
// src/components/documents/DocumentUploadModal.tsx

import { useState, useRef } from "react";
import type { UploadedPdfDocument } from "@/components/documents/types";

type DocumentUploadModalProps = {
  onClose: () => void;
  onUploaded: (document: UploadedPdfDocument) => void;
};

const API_URL = import.meta.env.VITE_API_URL;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".csv", ".xls", ".xlsx"]);
const ACCEPTED_FILE_TYPES = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".csv",
  ".xls",
  ".xlsx",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
].join(",");

export default function DocumentUploadModal({
  onClose,
  onUploaded,
}: Readonly<DocumentUploadModalProps>) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCancelUpload() {
    abortControllerRef.current?.abort();
  }

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

    const fileExtension = selectedFile.name.slice(
      selectedFile.name.lastIndexOf(".")
    ).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(fileExtension)) {
      setError("Please select a PDF, DOCX, TXT, or Markdown file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("The document must not exceed 10 MB.");
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file || isUploading) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
          signal: controller.signal
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

      const document: UploadedPdfDocument =
        await response.json();

      onUploaded(document);
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Could not upload the PDF.",
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setIsUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/65 p-4"
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
        className="w-full max-w-[460px] rounded-2xl border border-[#383838] bg-[#1c1c1c] p-6 text-[#f5f5f5] shadow-[0_24px_80px_rgb(0_0_0_/_35%)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-modal-title"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="document-modal-title" className="m-0 text-xl">Add a document</h2>
            <p className="mt-2 text-sm text-[#a3a3a3]">Upload a document to DocuMind.</p>
          </div>

          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent text-3xl leading-none text-[#a3a3a3] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <label className="flex cursor-pointer flex-col items-center gap-2.5 overflow-hidden rounded-xl border border-dashed border-[#555] p-8 text-center hover:border-[#9b87ff] hover:bg-[#7c5cff0f]">
          <span className="grid size-[42px] place-items-center rounded-full bg-[#302653] text-2xl text-[#c4b5fd]">↑</span>
          <strong className="break-words">
            {file ? file.name : "Choose a document file"}
          </strong>
          <span className="text-center text-sm text-[#a3a3a3]">PDF, DOCX, CSV, XLS, XLSX, TXT, or Markdown files up to 10 MB</span>

          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            disabled={isUploading}
            onChange={(event) =>
              handleFileChange(event.target.files?.[0])
            }
            ref={fileInputRef}
            className="mt-2 w-full text-sm"
          />
        </label>

        {error && (
          <p className="text-sm text-[#f87171]" role="alert">
            {error}
          </p>
        )}

        <footer className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
                <button
                    type="button"
                    className="rounded-lg bg-[#333] px-4 py-2.5 text-[#f5f5f5] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={onClose}
                    disabled={isUploading}
                >
                    Cancel
                </button>
                {file && (
                    <div className="flex max-w-[180px] items-center gap-2 text-sm text-[#c4b5fd]">
                      <span className="truncate">{file.name}</span>

                        <button
                            type="button"
                            onClick={handleResetFile}
                            disabled={isUploading}
                            className="shrink-0 text-xs underline"
                        >
                            Remove
                        </button>
                    </div>
                )}
                {isUploading && (
                    <button type="button" onClick={handleCancelUpload} className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                        Cancel upload
                    </button>
                )}
            </div>

          <button
            type="button"
            className="rounded-lg bg-[#7c5cff] px-4 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"
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
