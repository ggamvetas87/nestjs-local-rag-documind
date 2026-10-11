import type { HTMLAttributes, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "@/components/chat/types";

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  hasReceivedFirstChunk: boolean;
  onSuggestion: () => void;
};

function MarkdownPre({ children }: Readonly<{ children?: ReactNode }>) {
  return <>{children}</>;
}

function getCodeContent(children: ReactNode) {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children.join("");
  }

  return "";
}

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
      {getCodeContent(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
}

export default function ChatMessages({
  messages,
  isLoading,
  hasReceivedFirstChunk,
  onSuggestion,
}: Readonly<ChatMessagesProps>) {
  if (messages.length === 0) {
    return (
      <section className="chat">
        <div className="welcome">
          <div className="welcome-icon">✳</div>
          <h2>What would you like to know?</h2>
          <p>Ask a question and get an answer from your local AI model.</p>
          <button className="suggestion" onClick={onSuggestion}>
            Explain how RAG works →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="chat">
      <div className="messages">
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <span className="message-role">
              {message.role === "user" ? "You" : "DocuMind"}
            </span>

            {message.role === "assistant" ? (
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: MarkdownCode,
                    pre: MarkdownPre,
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
    </section>
  );
}
