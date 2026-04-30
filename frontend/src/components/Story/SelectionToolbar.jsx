import { useState } from "react";

export default function SelectionToolbar({ position, selectedText, onSubmit, onClose }) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!comment.trim()) return;
    setSubmitting(true);
    await onSubmit(comment.trim());
    setSubmitting(false);
    setComment("");
  }

  // Position the toolbar above the selection
  const style = {
    position: "fixed",
    top: Math.max(8, position.top - 140),
    left: Math.max(8, Math.min(position.left, window.innerWidth - 340)),
    zIndex: 1000,
  };

  return (
    <div className="selection-toolbar" style={style}>
      <div className="toolbar-header">
        <span className="toolbar-title">Revise selection</span>
        <button className="btn-close" onClick={onClose} title="Close">✕</button>
      </div>
      <div className="toolbar-selected">
        <em>"{selectedText.length > 80 ? selectedText.slice(0, 80) + "…" : selectedText}"</em>
      </div>
      <textarea
        className="toolbar-input"
        rows={2}
        placeholder="What should change? (e.g. 'make this more tense', 'she wouldn't say this')"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="toolbar-actions">
        <span className="toolbar-hint">⌘↵ to submit</span>
        <button className="btn-primary btn-small" disabled={!comment.trim() || submitting} onClick={handleSubmit}>
          {submitting ? "Rewriting…" : "Rewrite"}
        </button>
      </div>
    </div>
  );
}
