type ChatComposerProps = {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: { preventDefault: () => void }) => void;
  onAttach: () => void;
  onStop: () => void;
};

export default function ChatComposer({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onAttach,
  onStop,
}: Readonly<ChatComposerProps>) {
  return (
    <form
      className="rounded-2xl border border-[#414354] bg-[#20212c] p-3.5"
      onSubmit={onSubmit}
    >
      <textarea
        className="min-h-12 max-h-[180px] w-full resize-y border-0 bg-transparent font-inherit text-[#f3f4f6] outline-none placeholder:text-[#8b8c9b]"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
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
      <div className="flex items-center justify-between gap-3 border-t border-[#363744] pt-2.5 max-[520px]:items-start">
        <span className="text-[11px] text-[#9ca3af] max-[520px]:max-w-[180px]">
          Enter to send · Shift + Enter for a new line
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#454545] bg-transparent px-3 py-2 text-sm text-[#d4d4d4] hover:bg-[#2a2a2a] cursor-pointer"
            onClick={onAttach}
            aria-label="Attach a PDF document"
            title="Attach a PDF"
          >
            + Attach
          </button>
          <button
            type="submit"
            className="rounded-[10px] bg-[#c4b5fd] px-4 py-2.5 font-bold text-[#17132a] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? "Thinking..." : "Send ↑"}
          </button>

          {isLoading && (
            <button
              type="button"
              className="rounded-lg bg-[#b42318] px-4 py-2.5 text-white hover:bg-[#912018] cursor-pointer"
              onClick={onStop}
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
