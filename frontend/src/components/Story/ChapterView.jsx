import { useRef, useEffect, useState, useCallback } from "react";
import SelectionToolbar from "./SelectionToolbar";
import { api, readSSE } from "../../api";

function getTextOffset(root, targetNode, targetOffset) {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node === targetNode) return offset + targetOffset;
    offset += node.textContent.length;
  }
  return offset;
}

function captureSelection(storyDiv) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !storyDiv) return null;
  const range = sel.getRangeAt(0);
  if (!storyDiv.contains(range.commonAncestorContainer)) return null;
  const selectedText = sel.toString().trim();
  if (!selectedText) return null;
  const start = getTextOffset(storyDiv, range.startContainer, range.startOffset);
  const end = getTextOffset(storyDiv, range.endContainer, range.endOffset);
  const rect = range.getBoundingClientRect();
  return { text: selectedText, startOffset: start, endOffset: end, rect };
}

export default function ChapterView({ story, chapter, onContentUpdated }) {
  const storyRef = useRef(null);
  const selectionDebounce = useRef(null);
  const [selection, setSelection] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  // Write content to DOM directly — never trigger React re-render on the text div
  useEffect(() => {
    if (storyRef.current && chapter?.content !== undefined) {
      storyRef.current.textContent = chapter.content;
    }
  }, [chapter?.content]);

  // Unified handler: works for both mouse (desktop) and touch (mobile via selectionchange)
  const handleSelectionChange = useCallback(() => {
    if (streaming) return;
    clearTimeout(selectionDebounce.current);
    selectionDebounce.current = setTimeout(() => {
      const captured = captureSelection(storyRef.current);
      if (captured) setSelection(captured);
    }, 200); // debounce: mobile selection handles fire many events
  }, [streaming]);

  // mouseup for desktop (immediate), selectionchange for mobile (debounced)
  useEffect(() => {
    const div = storyRef.current;
    if (!div) return;
    const onMouseUp = () => {
      const captured = captureSelection(div);
      if (captured) setSelection(captured);
    };
    div.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      div.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
      clearTimeout(selectionDebounce.current);
    };
  }, [handleSelectionChange]);

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setError(null);
  }

  async function handleRewrite(comment) {
    if (!selection) return;
    const snap = { ...selection }; // snapshot before clearing
    setError(null);
    setStreaming(true);
    setSelection(null);
    window.getSelection()?.removeAllRanges();

    const res = await api.editPassage(story.id, chapter.number, {
      selected_text: snap.text,
      start_offset: snap.startOffset,
      end_offset: snap.endOffset,
      comment,
    });

    let replacement = "";

    await readSSE(
      res,
      (token) => {
        replacement += token;
        if (storyRef.current) {
          const before = chapter.content.slice(0, snap.startOffset);
          const after = chapter.content.slice(snap.endOffset);
          storyRef.current.textContent = before + replacement + after;
        }
      },
      () => {
        setStreaming(false);
        onContentUpdated();
      },
      (err) => {
        setError(err);
        setStreaming(false);
        if (storyRef.current) storyRef.current.textContent = chapter.content;
      }
    );
  }

  if (!chapter) return <div className="chapter-placeholder">Select or create a chapter to begin.</div>;

  return (
    <div className="chapter-view">
      <div className="chapter-meta">
        <h2 className="chapter-title">
          {chapter.title || `Chapter ${chapter.number}`}
        </h2>
        {chapter.brief && (
          <p className="chapter-brief"><em>Brief: {chapter.brief}</em></p>
        )}
      </div>

      {streaming && <div className="edit-indicator">Rewriting passage…</div>}
      {error && (
        <div className="error">
          {error}
          <button className="btn-small" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div ref={storyRef} className="chapter-content" />

      {!chapter.content && !streaming && (
        <div className="chapter-placeholder">Content not yet generated.</div>
      )}

      {selection && (
        <>
          <div
            className="selection-overlay"
            onClick={clearSelection}
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
          />
          <SelectionToolbar
            position={{ top: selection.rect.top, left: selection.rect.left }}
            selectedText={selection.text}
            onSubmit={handleRewrite}
            onClose={clearSelection}
          />
        </>
      )}
    </div>
  );
}
