import { useEffect, useState, useRef } from "react";
import { api, readSSE } from "./api";
import ChapterSidebar from "./components/Story/ChapterSidebar";
import ChapterView from "./components/Story/ChapterView";

export default function StoryView({ storyId }) {
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeChapterData, setActiveChapterData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
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
      // Auto-select the last chapter if any
      if (s.chapters.length > 0) {
        const last = s.chapters[s.chapters.length - 1];
        setActiveChapter(last.number);
        setActiveChapterData(last);
      }
    }).catch((e) => setError(e.message));
  }, [storyId]);

  async function handleSelectChapter(num) {
    setActiveChapter(num);
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

    // Auto-generate immediately
    await generateChapter(chapter.number);
  }

  async function generateChapter(num) {
    setGenerating(true);
    setStreamingContent("");
    setError(null);

    // Create a mutable chapter data object to preview while streaming
    setActiveChapterData((prev) => ({ ...prev, content: "" }));

    const res = await api.generateChapter(storyId, num);
    let accumulated = "";

    await readSSE(
      res,
      (token) => {
        accumulated += token;
        setStreamingContent(accumulated);
        setActiveChapterData((prev) => ({ ...prev, content: accumulated }));
      },
      async () => {
        setGenerating(false);
        setStreamingContent("");
        // Reload the full chapter from disk to get the persisted version
        try {
          const fresh = await api.getChapter(storyId, num);
          setActiveChapterData(fresh);
          // Update chapter title in sidebar if the LLM filled it
          if (fresh.title) {
            setChapters((prev) => prev.map((c) =>
              c.number === num ? { ...c, title: fresh.title } : c
            ));
          }
        } catch {
          // fallback: keep what we have
        }
      },
      (err) => {
        setError(err);
        setGenerating(false);
      }
    );
  }

  async function handleContentUpdated() {
    // Called after a targeted edit completes
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
      <ChapterSidebar
        story={story}
        chapters={chapters}
        activeChapter={activeChapter}
        onSelectChapter={handleSelectChapter}
        onChapterAdded={handleChapterAdded}
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
              ? "Create your first chapter using the sidebar."
              : "Set up your story using the sidebar."}
          </div>
        )}
      </div>
    </div>
  );
}
