import { useState } from "react";
import { api, readSSE } from "../../api";

const ROLES = ["protagonist", "antagonist", "supporting", "mentor", "other"];

export default function CharacterStep({ storyId, model, onDone, onBack }) {
  const [chars, setChars] = useState([]);
  const [form, setForm] = useState({ name: "", role: "protagonist", description: "" });
  const [generating, setGenerating] = useState(null); // char id being generated
  const [error, setError] = useState(null);

  async function handleAdd() {
    if (!form.name.trim() || !form.description.trim()) return;
    setError(null);
    const entry = { ...form, id: null, profile: "", status: "generating" };
    setChars((prev) => [...prev, entry]);
    const idx = chars.length;
    setForm({ name: "", role: "protagonist", description: "" });

    const res = await api.addCharacter(storyId, {
      name: entry.name,
      role: entry.role,
      description: entry.description,
    });

    const charId = res.headers.get("X-Character-Id");

    setChars((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], id: charId };
      return copy;
    });
    setGenerating(idx);

    await readSSE(
      res,
      (token) =>
        setChars((prev) => {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], profile: (copy[idx].profile || "") + token };
          return copy;
        }),
      () =>
        setChars((prev) => {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: "done" };
          setGenerating(null);
          return copy;
        }),
      (err) => {
        setError(err);
        setGenerating(null);
      }
    );
  }

  function removeChar(i) {
    setChars((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="wizard-step">
      <h2>Characters</h2>
      <p className="hint">Add the main characters. You can add more when writing later chapters.</p>

      {chars.length > 0 && (
        <div className="character-list">
          {chars.map((c, i) => (
            <div key={i} className={`character-card ${c.status}`}>
              <div className="char-header">
                <strong>{c.name}</strong>
                <span className="char-role">{c.role}</span>
                {c.status === "done" && (
                  <button className="btn-remove" onClick={() => removeChar(i)} title="Remove">✕</button>
                )}
              </div>
              {c.status === "generating" ? (
                <div className="char-profile streaming">{c.profile || "Generating profile…"}</div>
              ) : (
                <div className="char-profile">{c.profile}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="char-form">
        <div className="form-row">
          <input
            className="text-input"
            placeholder="Character name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <select
            className="select-input"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <textarea
          className="story-input"
          rows={2}
          placeholder="Brief description: personality, background, what makes them interesting…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {error && <div className="error">{error}</div>}
        <button
          className="btn-secondary"
          disabled={!form.name.trim() || !form.description.trim() || generating !== null}
          onClick={handleAdd}
        >
          + Add character
        </button>
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="btn-primary"
          disabled={chars.length === 0 || generating !== null}
          onClick={onDone}
        >
          Start writing →
        </button>
      </div>
    </div>
  );
}
