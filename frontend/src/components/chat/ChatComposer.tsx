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
    <form className="composer" onSubmit={onSubmit}>
      <textarea
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
      <div className="composer-footer">
        <span>Enter to send · Shift + Enter for a new line</span>

        <div>
            <button
                type="button"
                className="attach-button"
                onClick={onAttach}
                aria-label="Attach a PDF document"
                title="Attach a PDF"
            >
                + Attach
            </button>
            <button type="submit" disabled={!input.trim() || isLoading}>
                {isLoading ? "Thinking..." : "Send ↑"}
            </button>
        
            {isLoading && (
                <button type="button" className="stop-button" onClick={onStop}>
                    Stop
                </button>
            )}
        </div>
      </div>
    </form>
  );
}
