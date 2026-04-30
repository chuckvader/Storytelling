import { useState } from "react";

export default function ThemeStep({ onNext }) {
  const [theme, setTheme] = useState("");

  return (
    <div className="wizard-step">
      <h2>What's your story about?</h2>
      <p className="hint">Describe the genre, setting, and overall feel. Be as brief or detailed as you like.</p>
      <textarea
        className="story-input"
        rows={4}
        placeholder="e.g. A dark fantasy set in a crumbling empire where magic is illegal and revolution is brewing..."
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        autoFocus
      />
      <div className="step-actions">
        <button
          className="btn-primary"
          disabled={!theme.trim()}
          onClick={() => onNext(theme.trim())}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
