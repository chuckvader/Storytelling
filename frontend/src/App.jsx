import { useState, useEffect } from "react";
import WizardContainer from "./components/Wizard/WizardContainer";
import StoryView from "./StoryView";
import { api } from "./api";
import "./App.css";

export default function App() {
  const [view, setView] = useState("home"); // "home" | "wizard" | "story"
  const [storyId, setStoryId] = useState(null);
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    if (view === "home") {
      setLoadingStories(true);
      api.listStories()
        .then(setStories)
        .catch(() => setStories([]))
        .finally(() => setLoadingStories(false));
    }
  }, [view]);

  function handleStoryReady(id) {
    setStoryId(id);
    setView("story");
  }

  function handleOpenStory(id) {
    setStoryId(id);
    setView("story");
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this story?")) return;
    await api.deleteStory(id).catch(() => {});
    setStories((prev) => prev.filter((s) => s.id !== id));
  }

  if (view === "wizard") {
    return (
      <div className="app">
        <header className="app-header">
          <button className="btn-ghost" onClick={() => setView("home")}>← Back</button>
          <span className="app-title">New Story</span>
        </header>
        <main className="app-main">
          <WizardContainer onStoryReady={handleStoryReady} />
        </main>
      </div>
    );
  }

  if (view === "story" && storyId) {
    return (
      <div className="app">
        <header className="app-header">
          <button className="btn-ghost" onClick={() => setView("home")}>← Stories</button>
          <span className="app-title">Story Writer</span>
        </header>
        <main className="app-main full">
          <StoryView storyId={storyId} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">✍️ Story Writing Assistant</span>
      </header>
      <main className="app-main home">
        <div className="home-hero">
          <h1>Your stories</h1>
          <button className="btn-primary btn-large" onClick={() => setView("wizard")}>
            + New story
          </button>
        </div>

        {loadingStories ? (
          <div className="hint">Loading…</div>
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <p>No stories yet. Start one above.</p>
          </div>
        ) : (
          <ul className="story-list">
            {stories.map((s) => (
              <li key={s.id} className="story-card" onClick={() => handleOpenStory(s.id)}>
                <div className="story-card-body">
                  <strong>{s.title || s.theme.slice(0, 60)}</strong>
                  <span className="story-meta">
                    {s.format} · {s.chapter_count} chapter{s.chapter_count !== 1 ? "s" : ""}
                  </span>
                  <span className="story-meta">{new Date(s.updated_at).toLocaleDateString()}</span>
                </div>
                <button
                  className="btn-ghost btn-danger"
                  onClick={(e) => handleDelete(s.id, e)}
                  title="Delete"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
