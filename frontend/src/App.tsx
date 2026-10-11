import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@/App.css";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();

    const message = input.trim();

    if (!message || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: message,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data: { answer: string } = await response.json();

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.answer,
        },
      ]);
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

      <section className="chat">
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-icon">✳</div>
            <h2>What would you like to know?</h2>
            <p>
              Ask a question and get an answer from your local AI model.
            </p>
            <button
              className="suggestion"
              onClick={() =>
                setInput("Explain RAG and how it works.")
              }
            >
              Explain how RAG works →
            </button>
          </div>
        ) : (
          <div className="messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`message ${message.role}`}
              >
                <span className="message-role">
                  {message.role === "user" ? "You" : "DocuMind"}
                </span>
                
                {message.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}

              </article>
            ))}

            {isLoading && (
              <div className="message assistant">
                <span className="message-role">DocuMind</span>
                <p className="loading">Thinking...</p>
              </div>
            )}
          </div>
        )}
      </section>

      {error && <p className="error">{error}</p>}

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask DocuMind anything..."
          aria-label="Your message"
          maxLength={4000}
          rows={2}
          disabled={isLoading}
        />
        <div className="composer-footer">
          <span>Enter to send · Shift + Enter for a new line</span>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? "Thinking..." : "Send ↑"}
          </button>
        </div>
      </form>

      <footer className="footer">
        Powered by Ollama · Running locally on your machine
      </footer>
    </main>
  );
}

export default App;
