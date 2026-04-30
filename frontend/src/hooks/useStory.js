import { useState, useCallback } from "react";
import { api, readSSE } from "../api";

export function useStory(storyId) {
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeContent, setActiveContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const loadStory = useCallback(async () => {
    if (!storyId) return;
    try {
      const s = await api.getStory(storyId);
      setStory(s);
      const chaps = s.chapters.map((ch) => ({
        number: ch.number,
        title: ch.title,
        brief: ch.brief,
      }));
      setChapters(chaps);
    } catch (e) {
      setError(e.message);
    }
  }, [storyId]);

  const selectChapter = useCallback(async (num) => {
    setActiveChapter(num);
    try {
      const ch = await api.getChapter(storyId, num);
      setActiveContent(ch.content || "");
      return ch;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, [storyId]);

  const generateChapter = useCallback(async (num, onToken) => {
    setGenerating(true);
    setError(null);
    setActiveContent("");
    try {
      const res = await api.generateChapter(storyId, num);
      await readSSE(
        res,
        (token) => {
          setActiveContent((prev) => prev + token);
          onToken?.(token);
        },
        async () => {
          setGenerating(false);
          // Refresh story to get updated chapter
          await loadStory();
        },
        (err) => {
          setError(err);
          setGenerating(false);
        }
      );
    } catch (e) {
      setError(e.message);
      setGenerating(false);
    }
  }, [storyId, loadStory]);

  const refreshChapter = useCallback(async (num) => {
    try {
      const ch = await api.getChapter(storyId, num);
      setActiveContent(ch.content || "");
      return ch;
    } catch (e) {
      setError(e.message);
    }
  }, [storyId]);

  return {
    story, chapters, activeChapter, activeContent,
    generating, error, setError,
    loadStory, selectChapter, generateChapter, refreshChapter,
    setChapters, setActiveChapter, setActiveContent,
  };
}
