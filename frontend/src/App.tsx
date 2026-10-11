import { useEffect, useRef, useState } from "react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatMessages from "@/components/chat/ChatMessages";
import DocumentUploadModal from "@/components/documents/DocumentUploadModal";
import type { Message } from "@/components/chat/types";
import type { ExtractedPdfDocument } from "@/components/documents/types";
import "@/App.css";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasReceivedFirstChunk, setHasReceivedFirstChunk] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documents, setDocuments] = useState<
    { id: string; document: ExtractedPdfDocument }[]
  >([]);

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const message = input.trim();

    if (!message || isLoading) return;

    const userId = Date.now();
    const assistantId = userId + 1;

    setMessages((previous) => [
      ...previous,
      { id: userId, role: "user", content: message },
      { id: assistantId, role: "assistant", content: "" },
    ]);

    setInput("");
    setError("");
    setIsLoading(true);

    setHasReceivedFirstChunk(false);

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error("Streaming is not supported by this response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let receivedFirstChunk = false;

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        if (value?.length && !receivedFirstChunk) {
          receivedFirstChunk = true;
          setHasReceivedFirstChunk(true);
        }

        const chunk = decoder.decode(value, { stream: true });

        setMessages((previous) =>
          previous.map((item) =>
            item.id === assistantId
              ? { ...item, content: item.content + chunk }
              : item,
          ),
        );
      }

      const remaining = decoder.decode();

      if (remaining) {
        setMessages((previous) =>
          previous.map((item) =>
            item.id === assistantId
              ? { ...item, content: item.content + remaining }
              : item,
          ),
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User aborted the request.
        // We keep the response that has already been produced.
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setIsLoading(false);
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  return (
    <main className="app">
      <header className="header">
        <div className="brand-icon">D</div>
        <div>
          <h1>DocuMind</h1>
          <p>Local AI assistant · Qwen3</p>
        </div>
        <span className="status">
          <span className="status-dot" />{" "}Local
        </span>
      </header>

      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        hasReceivedFirstChunk={hasReceivedFirstChunk}
        onSuggestion={() => setInput("Explain RAG and how it works.")}
      />

      {error && <p className="error">{error}</p>}

      {documents.length > 0 && (
        <div className="attached-documents attachments">
          {documents.map(({ id, document }) => (
            <div className="attached-document attachment" key={id}>
              <div>
                <span>📄 {document.filename}</span>
                <button
                  type="button"
                  aria-label={`Remove ${document.filename}`}
                  onClick={() =>
                    setDocuments((previous) =>
                      previous.filter((item) => item.id !== id),
                    )
                  }
                >
                  ×
                </button>
              </div>

              {/* <div className="attached-document-info">
                <strong>{document.filename}</strong>
                <span aria-hidden="true">PDF</span>
                <small>
                  {document.pageCount}{" "}
                  {document.pageCount === 1 ? "page" : "pages"}
                </small>
              </div> */}
            </div>
          ))}
        </div>
        // <div className="attached-documents">
        //   {documents.map((document, index) => (
        //     <div
        //       className="attached-document"
        //       key={`${document.filename}-${index}`}
        //     >
        //       <span aria-hidden="true">PDF</span>
        //       <div className="attached-document-info">
        //         <strong>{document.filename}</strong>
        //         <small>
        //           {document.pageCount}{" "}
        //           {document.pageCount === 1 ? "page" : "pages"}
        //         </small>
        //       </div>
        //     </div>
        //   ))}
        // </div>
      )}

      <ChatComposer
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onAttach={() => setIsDocumentModalOpen(true)}
        onStop={handleStop}
      />

      {isDocumentModalOpen && (
        <DocumentUploadModal
          onClose={() => setIsDocumentModalOpen(false)}
          onUploaded={(document) =>
            setDocuments(previous => [
              ...previous,
              { id: crypto.randomUUID(), document }
            ])
          }
        />
      )}

      <footer className="footer">
        Powered by Ollama · Running locally on your machine
      </footer>
    </main>
  );
}

export default App;
