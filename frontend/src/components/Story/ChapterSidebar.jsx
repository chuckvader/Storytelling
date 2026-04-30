import { useState } from "react";
import { api } from "../../api";

export default function ChapterSidebar({ story, chapters, activeChapter, onSelectChapter, onChapterAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [brief, setBrief] = useState("");
  const [title, setTitle] = useState("");
  const [newCharName, setNewCharName] = useState("");
  const [newCharRole, setNewCharRole] = useState("supporting");
  const [newCharDesc, setNewCharDesc] = useState("");
  const [pendingNewChars, setPendingNewChars] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function addPendingChar() {
    if (!newCharName.trim() || !newCharDesc.trim()) return;
    setPendingNewChars((prev) => [...prev, { name: newCharName, role: newCharRole, description: newCharDesc }]);
    setNewCharName("");
    setNewCharRole("supporting");
    setNewCharDesc("");
  }

  async function handleSubmit() {
    if (!brief.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // Add any pending new characters first
      const newCharIds = [];
      const isEpisodic = story.format === "episodic";
      const nextChapterNum = chapters.length + 1;

      for (const nc of pendingNewChars) {
        const res = await api.addCharacter(story.id, {
          ...nc,
          introduced_in: nextChapterNum,
        });
        const id = res.headers.get("X-Character-Id");
        // Drain the SSE stream (we don't display it here, profiles shown in the character panel)
        const reader = res.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
        if (id) newCharIds.push(id);
      }

      const chapter = await api.addChapter(story.id, {
        brief: brief.trim(),
        title: title.trim() || undefined,
        new_character_ids: newCharIds,
      });

      setBrief("");
      setTitle("");
      setPendingNewChars([]);
      setShowForm(false);
      onChapterAdded(chapter);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isEpisodic = story.format === "episodic";
  const nextNum = chapters.length + 1;

  return (
    <aside className="chapter-sidebar">
      <div className="sidebar-header">
        <h3>{isEpisodic ? "Chapters" : "Story"}</h3>
        {isEpisodic && !showForm && (
          <button className="btn-small" onClick={() => setShowForm(true)}>
            + New chapter
          </button>
        )}
      </div>

      <ul className="chapter-list">
        {chapters.map((ch) => (
          <li
            key={ch.number}
            className={`chapter-item ${activeChapter === ch.number ? "active" : ""}`}
            onClick={() => onSelectChapter(ch.number)}
          >
            <span className="ch-num">Ch. {ch.number}</span>
            <span className="ch-title">{ch.title || ch.brief?.slice(0, 40) || "Untitled"}</span>
          </li>
        ))}
      </ul>

      {(showForm || (!isEpisodic && chapters.length === 0)) && (
        <div className="new-chapter-form">
          <h4>{isEpisodic ? `Chapter ${nextNum}` : "Your Story"}</h4>

          {isEpisodic && (
            <input
              className="text-input"
              placeholder="Chapter title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          )}

          <textarea
            className="story-input"
            rows={3}
            placeholder={isEpisodic
              ? "What happens in this chapter?"
              : "What is this story about? What happens?"}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            autoFocus
          />

          {isEpisodic && nextNum > 1 && (
            <details className="new-chars-section">
              <summary>Introduce new characters?</summary>
              <div className="new-char-inputs">
                <input
                  className="text-input"
                  placeholder="Name"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                />
                <select
                  className="select-input"
                  value={newCharRole}
                  onChange={(e) => setNewCharRole(e.target.value)}
                >
                  {["protagonist","antagonist","supporting","mentor","other"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <textarea
                  className="story-input"
                  rows={2}
                  placeholder="Brief description"
                  value={newCharDesc}
                  onChange={(e) => setNewCharDesc(e.target.value)}
                />
                <button
                  className="btn-small"
                  disabled={!newCharName.trim() || !newCharDesc.trim()}
                  onClick={addPendingChar}
                >
                  + Add
                </button>
              </div>
              {pendingNewChars.length > 0 && (
                <ul className="pending-chars">
                  {pendingNewChars.map((c, i) => (
                    <li key={i}>{c.name} <em>({c.role})</em></li>
                  ))}
                </ul>
              )}
            </details>
          )}

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            {isEpisodic && (
              <button className="btn-secondary" onClick={() => { setShowForm(false); setError(null); }}>
                Cancel
              </button>
            )}
            <button
              className="btn-primary"
              disabled={!brief.trim() || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Creating…" : "Generate →"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
