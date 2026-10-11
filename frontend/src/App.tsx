import type { HTMLAttributes, FormEvent } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "@/App.css";

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const API_URL = import.meta.env.VITE_API_URL;

function MarkdownCode({ className, children, ...props }: MarkdownCodeProps) {
  const match = /language-([\w-]+)/.exec(className || "");

  if (!match) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <SyntaxHighlighter
      language={match[1]}
      style={oneDark}
      PreTag="div"
      customStyle={{
        margin: "1rem 0",
        padding: "1rem",
        borderRadius: "10px",
        fontSize: "0.875rem",
        overflowX: "auto",
      }}
      codeTagProps={{
        style: {
          fontFamily: '"SFMono-Regular", Consolas, monospace',
        },
      }}
      wrapLongLines={false}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasReceivedFirstChunk, setHasReceivedFirstChunk] = useState(false);

  
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
                
                {message.role === "assistant" ? (
                  <div className="markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: MarkdownCode,
                        pre: ({ children }) => <>{children}</>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}

              </article>
            ))}

            {isLoading && !hasReceivedFirstChunk && (
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
