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
      <code className={`rounded bg-[#343442] px-1.5 py-0.5 text-[0.9em] text-[#ddd6fe] ${className ?? ""}`} {...props}>
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
      <section className="flex-1 py-8">
        <div className="flex min-h-[390px] flex-col items-center justify-center text-center">
          <div className="grid size-[58px] place-items-center rounded-xl bg-[#c4b5fd] text-[34px] font-extrabold text-[#17132a]">✳</div>
          <h2 className="mt-6 text-[clamp(22px,4vw,30px)]">What would you like to know?</h2>
          <p className="mt-1 max-w-[380px] text-[13px] leading-7 text-[#9ca3af]">Ask a question and get an answer from your local AI model.</p>
          <button className="mt-7 cursor-pointer rounded-xl border border-[#414354] bg-[#20212c] px-4 py-3 text-[#ddd6fe]" onClick={onSuggestion}>
            Explain how RAG works →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 py-8">
      <div className="flex flex-col gap-6">
        {messages.map((message) => (
          <article key={message.id} className={`max-w-[90%] overflow-hidden rounded-2xl px-[18px] py-4 leading-7 max-[520px]:max-w-full ${message.role === "user" ? "self-end bg-[#312e46]" : "self-start border border-[#30313e] bg-[#20212c]"}`}>
            <span className="text-xs font-bold text-[#c4b5fd]">
              {message.role === "user" ? "You" : "DocuMind"}
            </span>

            {message.role === "assistant" ? (
              <div className="leading-7 [overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-[#c4b5fd] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#a78bfa] [&_blockquote]:bg-[#292936] [&_blockquote]:px-4 [&_blockquote]:py-1 [&_blockquote]:text-[#c4c5d0] [&_h1]:my-6 [&_h1]:text-[1.6rem] [&_h1]:leading-tight [&_h2]:my-6 [&_h2]:text-[1.35rem] [&_h2]:leading-tight [&_h3]:my-6 [&_h3]:text-[1.12rem] [&_h3]:leading-tight [&_li]:my-1 [&_li]:pl-1 [&_ol]:my-3 [&_ol]:pl-6 [&_p]:my-3 [&_p]:whitespace-normal [&_strong]:text-[#e9e5ff] [&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_td]:min-w-[100px] [&_td]:border [&_td]:border-[#414354] [&_td]:p-3 [&_th]:min-w-[100px] [&_th]:border [&_th]:border-[#414354] [&_th]:bg-[#30303f] [&_th]:p-3 [&_th]:text-left [&_ul]:my-3 [&_ul]:pl-6 [&_hr]:my-6 [&_hr]:border-t [&_hr]:border-[#414354]">
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
          <div className="self-start rounded-2xl border border-[#30313e] bg-[#20212c] px-[18px] py-4">
            <span className="text-xs font-bold text-[#c4b5fd]">DocuMind</span>
            <p className="mt-2 text-[#a5a5b5]">Thinking...</p>
          </div>
        )}
      </div>
    </section>
  );
}
