import { useRef, useState } from "react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatMessages from "@/components/chat/ChatMessages";
import DocumentUploadModal from "@/components/documents/DocumentUploadModal";
import type { Message } from "@/components/chat/types";
import type { UploadedPdfDocument } from "@/components/documents/types";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasReceivedFirstChunk, setHasReceivedFirstChunk] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<
    { id: string; document: UploadedPdfDocument }[]
  >([]);

  async function handleSubmit(event: { preventDefault: () => void }) {
  event.preventDefault();

  const message = input.trim();

  if (!message || isLoading) return;

  const controller = new AbortController();
  abortControllerRef.current = controller;

  const userId = Date.now();
  const assistantId = userId + 1;
  const documentId = selectedDocumentId;

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
    if (documentId) {
      const response = await fetch(`${API_URL}/documents/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: message, documentId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errorMessage = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;

        throw new Error(
          errorMessage ?? `Request failed (${response.status})`,
        );
      }

      const result: {
        answer: string;
        citations: {
          source: number;
          filename: string;
          pageNumber: number;
          score: number;
        }[];
      } = await response.json();

      const citationsText = result.citations.length
        ? "\n\n**Sources**\n\n" +
          result.citations
            .map(
              (citation) =>
                `- ${citation.source}. ${citation.filename}, page ${citation.pageNumber}`,
            )
            .join("\n")
        : "";

      setMessages((previous) =>
        previous.map((item) =>
          item.id === assistantId
            ? { ...item, content: result.answer + citationsText }
            : item,
        ),
      );

      setHasReceivedFirstChunk(true);
    } else {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
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
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      // Keep any response content already produced.
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
    <main className="mx-auto flex min-h-screen w-[calc(100%-2rem)] max-w-[850px] flex-col">
      <header className="flex items-center gap-3 border-b border-[#292d38] py-6">
        <div className="grid size-[42px] place-items-center rounded-xl bg-[#c4b5fd] text-[22px] font-extrabold text-[#17132a]">D</div>
        <div>
          <h1 className="m-0 text-lg">DocuMind</h1>
          <p className="m-0 mt-1 text-[13px] text-[#9ca3af]">Local AI assistant · Qwen3</p>
        </div>
        <span className="ml-auto flex items-center gap-2 text-xs text-[#86efac]">
          <span className="size-[7px] rounded-full bg-[#4ade80]" /> Local
        </span>
      </header>

      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        hasReceivedFirstChunk={hasReceivedFirstChunk}
        onSuggestion={() => setInput("Explain RAG and how it works.")}
      />

      {isDocumentModalOpen && (
        <DocumentUploadModal
          onClose={() => setIsDocumentModalOpen(false)}
          onUploaded={(document) => {
            setDocuments(previous => [
              ...previous.filter(
                item => item.documentId !== document.documentId,
              ),
              document
            ]);

            setSelectedDocumentId(document.documentId);
          }}
        />
      )}

      <div className="sticky bottom-0 z-20 mb-3 bg-[#14151b]/95 pb-1 pt-3 backdrop-blur-sm">
        {error && <p className="text-[13px] text-[#fca5a5]">{error}</p>}

        {documents.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {documents.map((document) => {
              const isSelected = selectedDocumentId === document.documentId;

              return (
                <div
                  key={document.documentId}
                  className={`flex max-w-full items-center gap-2 rounded-[10px] border px-3 py-2 ${
                    isSelected
                      ? "border-[#9b87ff] bg-[#302653]"
                      : "border-[#383838] bg-[#1c1c1c]"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 truncate text-sm text-[#d4d4d4]"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedDocumentId(
                        isSelected ? null : document.documentId,
                      )
                    }
                    title={`${document.filename} · ${document.pageCount} pages`}
                  >
                    📄 {document.filename}
                  </button>

                  <button
                    type="button"
                    className="text-lg leading-none text-[#a3a3a3] hover:text-white"
                    aria-label={`Remove ${document.filename}`}
                    onClick={() => {
                      setDocuments((previous) =>
                        previous.filter(
                          (item) =>
                            item.documentId !== document.documentId,
                        ),
                      );

                      if (isSelected) {
                        setSelectedDocumentId(null);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          )}

        <ChatComposer
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onAttach={() => setIsDocumentModalOpen(true)}
          onStop={handleStop}
        />

        <footer className="py-5 text-center text-xs text-[#777989]">
          Powered by Ollama · Running locally on your machine
        </footer>
      </div>
    </main>
  );
}

export default App;
