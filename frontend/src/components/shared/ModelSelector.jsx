import { useEffect, useState } from "react";
import { api } from "../../api";

export default function ModelSelector({ selected, onSelect }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getModels()
      .then((data) => {
        setModels(data.models || []);
        if (data.models?.length && !selected) onSelect(data.models[0]);
      })
      .catch((e) => setError("Ollama not reachable: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="hint">Loading models…</div>;
  if (error) return <div className="error">{error}</div>;
  if (!models.length) return <div className="error">No models found. Run <code>ollama pull llama3</code> first.</div>;

  return (
    <select
      className="select-input"
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
    >
      {models.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}
