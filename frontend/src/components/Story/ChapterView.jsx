import { useRef, useEffect, useState, useCallback } from "react";
import SelectionToolbar from "./SelectionToolbar";
import { api, readSSE } from "../../api";

/**
 * Walk text nodes inside root and convert a DOM (node, offset) pair
 * to an integer character offset into the plain-text content.
 */
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

export default function ChapterView({ story, chapter, onContentUpdated }) {
  const storyRef = useRef(null);
  const [selection, setSelection] = useState(null); // { text, startOffset, endOffset, rect }
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState(null); // replacement being streamed
  const [error, setError] = useState(null);

  // Write content to DOM directly to avoid React clearing browser selections
  useEffect(() => {
    if (storyRef.current && chapter?.content) {
      storyRef.current.textContent = chapter.content;
    }
  }, [chapter?.content]);

  const handleMouseUp = useCallback(() => {
    if (streaming) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !storyRef.current) return;

    const range = sel.getRangeAt(0);
    // Ensure the selection is within our story div
    if (!storyRef.current.contains(range.commonAncestorContainer)) return;

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    const start = getTextOffset(storyRef.current, range.startContainer, range.startOffset);
    const end = getTextOffset(storyRef.current, range.endContainer, range.endOffset);
    const rect = range.getBoundingClientRect();

    setSelection({
      text: selectedText,
      startOffset: start,
      endOffset: end,
      rect,
    });
  }, [streaming]);

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setStreamContent(null);
    setError(null);
  }

  async function handleRewrite(comment) {
    if (!selection) return;
    setError(null);
    setStreaming(true);
    setStreamContent("");
    setSelection(null);
    window.getSelection()?.removeAllRanges();

    const res = await api.editPassage(story.id, chapter.number, {
      selected_text: selection.text,
      start_offset: selection.startOffset,
      end_offset: selection.endOffset,
      comment,
    });

    let replacement = "";

    await readSSE(
      res,
      (token) => {
        replacement += token;
        setStreamContent(replacement);
        // Live-preview: splice the replacement into the DOM
        if (storyRef.current) {
          const before = chapter.content.slice(0, selection.startOffset);
          const after = chapter.content.slice(selection.endOffset);
          storyRef.current.textContent = before + replacement + after;
        }
      },
      () => {
        // Stream done: the backend already saved the new content; reload it
        setStreaming(false);
        setStreamContent(null);
        onContentUpdated();
      },
      (err) => {
        setError(err);
        setStreaming(false);
        // Restore original content on error
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

      {streaming && (
        <div className="edit-indicator">Rewriting passage…</div>
      )}
      {error && (
        <div className="error">{error} <button className="btn-small" onClick={() => setError(null)}>Dismiss</button></div>
      )}

      <div
        ref={storyRef}
        className="chapter-content"
        onMouseUp={handleMouseUp}
      />

      {!chapter.content && !streaming && (
        <div className="chapter-placeholder">Content not yet generated.</div>
      )}

      {selection && (
        <SelectionToolbar
          position={{ top: selection.rect.top, left: selection.rect.left }}
          selectedText={selection.text}
          onSubmit={handleRewrite}
          onClose={clearSelection}
        />
      )}

      {selection && (
        <div
          className="selection-overlay"
          onClick={clearSelection}
          style={{ position: "fixed", inset: 0, zIndex: 999 }}
        />
      )}
    </div>
  );
}
