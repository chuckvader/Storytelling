export default function FormatStep({ theme, onNext, onBack }) {
  return (
    <div className="wizard-step">
      <h2>Story structure</h2>
      <p className="hint">How would you like to tell this story?</p>
      <div className="format-cards">
        <button className="format-card" onClick={() => onNext("episodic")}>
          <span className="format-icon">📖</span>
          <strong>Episodic / Chapters</strong>
          <span>Write chapter by chapter, building a longer narrative over multiple sessions.</span>
        </button>
        <button className="format-card" onClick={() => onNext("oneshot")}>
          <span className="format-icon">✍️</span>
          <strong>One-shot</strong>
          <span>A single self-contained story, written start to finish in one go.</span>
        </button>
      </div>
      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}
