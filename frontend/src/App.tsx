import { useState } from "react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatMessages from "@/components/chat/ChatMessages";
import type { Message } from "@/components/chat/types";
import DocumentsPanel from "@/components/documents/DocumentsPanel";
import "@/App.css";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasReceivedFirstChunk, setHasReceivedFirstChunk] = useState(false);

  
  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();

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
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
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

      <DocumentsPanel />
      <p></p>

      <ChatComposer
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />

      <footer className="footer">
        Powered by Ollama · Running locally on your machine
      </footer>
    </main>
  );
}

export default App;
