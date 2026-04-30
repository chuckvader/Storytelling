const BASE = "/api";

async function req(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Ollama
  getModels: () => req("GET", "/ollama/models"),

  // Stories
  listStories: () => req("GET", "/stories"),
  createStory: (body) => req("POST", "/stories", body),
  getStory: (id) => req("GET", `/stories/${id}`),
  deleteStory: (id) => req("DELETE", `/stories/${id}`),

  // Characters (returns Response for SSE — caller handles stream)
  addCharacter: (storyId, body) =>
    fetch(`${BASE}/stories/${storyId}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  // Chapters
  addChapter: (storyId, body) => req("POST", `/stories/${storyId}/chapters`, body),
  listChapters: (storyId) => req("GET", `/stories/${storyId}/chapters`),
  getChapter: (storyId, n) => req("GET", `/stories/${storyId}/chapters/${n}`),
  updateChapter: (storyId, n, body) => req("PATCH", `/stories/${storyId}/chapters/${n}`, body),

  // Streaming (returns Response for SSE)
  generateChapter: (storyId, n) =>
    fetch(`${BASE}/stories/${storyId}/chapters/${n}/generate`, { method: "POST" }),
  editPassage: (storyId, n, body) =>
    fetch(`${BASE}/stories/${storyId}/chapters/${n}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};

/**
 * Read an SSE stream from a Response object.
 * Calls onToken(token) for each token, onDone() when complete.
 */
export async function readSSE(response, onToken, onDone, onError) {
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    onError?.(err.detail || response.statusText);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              onDone?.();
            } else if (data.token) {
              onToken(data.token);
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    }
  } catch (e) {
    onError?.(e.message);
  }
}
