import { useState } from "react";
import ThemeStep from "./ThemeStep";
import FormatStep from "./FormatStep";
import CharacterStep from "./CharacterStep";
import ModelSelector from "../shared/ModelSelector";
import { api } from "../../api";

const STEPS = ["theme", "format", "model", "characters"];

export default function WizardContainer({ onStoryReady }) {
  const [step, setStep] = useState("theme");
  const [theme, setTheme] = useState("");
  const [format, setFormat] = useState("");
  const [model, setModel] = useState("llama3");
  const [storyId, setStoryId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  async function handleFormat(fmt) {
    setFormat(fmt);
    setStep("model");
  }

  async function handleModel(selectedModel) {
    setCreating(true);
    setError(null);
    try {
      const story = await api.createStory({ theme, format, model: selectedModel });
      setModel(selectedModel);
      setStoryId(story.id);
      setStep("characters");
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function handleDone() {
    onStoryReady(storyId);
  }

  return (
    <div className="wizard-container">
      <div className="wizard-progress">
        {["Theme", "Format", "Model", "Characters"].map((label, i) => {
          const stepKeys = ["theme", "format", "model", "characters"];
          const current = STEPS.indexOf(step);
          const idx = i;
          return (
            <div
              key={label}
              className={`progress-step ${idx < current ? "done" : idx === current ? "active" : ""}`}
            >
              <span className="progress-dot">{idx < current ? "✓" : idx + 1}</span>
              <span className="progress-label">{label}</span>
            </div>
          );
        })}
      </div>

      {error && <div className="error">{error}</div>}

      {step === "theme" && (
        <ThemeStep onNext={(t) => { setTheme(t); setStep("format"); }} />
      )}
      {step === "format" && (
        <FormatStep theme={theme} onNext={handleFormat} onBack={() => setStep("theme")} />
      )}
      {step === "model" && (
        <div className="wizard-step">
          <h2>Choose your AI model</h2>
          <p className="hint">Select the Ollama model to use for writing.</p>
          <ModelSelector selected={model} onSelect={setModel} />
          {creating && <div className="hint">Creating story…</div>}
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep("format")}>← Back</button>
            <button className="btn-primary" disabled={creating} onClick={() => handleModel(model)}>
              Next →
            </button>
          </div>
        </div>
      )}
      {step === "characters" && (
        <CharacterStep
          storyId={storyId}
          model={model}
          onDone={handleDone}
          onBack={() => setStep("model")}
        />
      )}
    </div>
  );
}
