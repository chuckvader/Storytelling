import { useEffect, useState } from "react";
import { api, readSSE } from "./api";
import ChapterSidebar from "./components/Story/ChapterSidebar";
import ChapterView from "./components/Story/ChapterView";

export default function StoryView({ storyId, sidebarOpen, onSidebarClose }) {
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeChapterData, setActiveChapterData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getStory(storyId).then((s) => {
      setStory(s);
      const chaps = s.chapters.map((ch) => ({
        number: ch.number,
        title: ch.title,
        brief: ch.brief,
      }));
      setChapters(chaps);
      if (s.chapters.length > 0) {
        const last = s.chapters[s.chapters.length - 1];
        setActiveChapter(last.number);
        setActiveChapterData(last);
      }
    }).catch((e) => setError(e.message));
  }, [storyId]);

  async function handleSelectChapter(num) {
    setActiveChapter(num);
    onSidebarClose();
    try {
      const ch = await api.getChapter(storyId, num);
      setActiveChapterData(ch);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleChapterAdded(chapter) {
    setChapters((prev) => {
      const exists = prev.find((c) => c.number === chapter.number);
      if (exists) return prev;
      return [...prev, { number: chapter.number, title: chapter.title, brief: chapter.brief }];
    });
    setActiveChapter(chapter.number);
    setActiveChapterData(chapter);
    onSidebarClose();
    await generateChapter(chapter.number);
  }

  async function generateChapter(num) {
    setGenerating(true);
    setError(null);
    setActiveChapterData((prev) => ({ ...prev, content: "" }));

    const res = await api.generateChapter(storyId, num);
    let accumulated = "";

    await readSSE(
      res,
      (token) => {
        accumulated += token;
        setActiveChapterData((prev) => ({ ...prev, content: accumulated }));
      },
      async () => {
        setGenerating(false);
        try {
          const fresh = await api.getChapter(storyId, num);
          setActiveChapterData(fresh);
          if (fresh.title) {
            setChapters((prev) => prev.map((c) =>
              c.number === num ? { ...c, title: fresh.title } : c
            ));
          }
        } catch {
          // keep accumulated content
        }
      },
      (err) => {
        setError(err);
        setGenerating(false);
      }
    );
  }

  async function handleContentUpdated() {
    try {
      const fresh = await api.getChapter(storyId, activeChapter);
      setActiveChapterData(fresh);
    } catch (e) {
      setError(e.message);
    }
  }

  if (!story) return <div className="loading">Loading story…</div>;

  return (
    <div className="story-layout">
      {/* Sidebar drawer overlay (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={onSidebarClose} />
      )}

      <ChapterSidebar
        story={story}
        chapters={chapters}
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
        onChapterAdded={handleChapterAdded}
        isOpen={sidebarOpen}
      />

      <div className="story-main">
        {error && (
          <div className="error banner">
            {error}
            <button className="btn-small" onClick={() => setError(null)}>✕</button>
          </div>
        )}
        {generating && (
          <div className="generating-banner">
            ✍️ Writing{activeChapterData ? ` chapter ${activeChapterData.number}` : ""}…
          </div>
        )}

        {activeChapterData ? (
          <ChapterView
            story={story}
            chapter={activeChapterData}
            onContentUpdated={handleContentUpdated}
          />
        ) : (
          <div className="chapter-placeholder">
            {story.format === "episodic"
              ? "Tap ☰ to create your first chapter."
              : "Tap ☰ to set up your story."}
          </div>
        )}
      </div>
    </div>
  );
}
