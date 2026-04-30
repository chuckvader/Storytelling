import json
import uuid
import os
from datetime import datetime, timezone
from typing import Optional

STORIES_DIR = os.path.join(os.path.dirname(__file__), "..", "stories")


def _stories_dir() -> str:
    path = os.path.abspath(STORIES_DIR)
    os.makedirs(path, exist_ok=True)
    return path


def _story_path(story_id: str) -> str:
    return os.path.join(_stories_dir(), f"{story_id}.json")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_story(theme: str, format: str, model: str, title: Optional[str] = None) -> dict:
    story = {
        "id": str(uuid.uuid4()),
        "title": title,
        "theme": theme,
        "format": format,
        "model": model,
        "characters": [],
        "chapters": [],
        "created_at": _now(),
        "updated_at": _now(),
    }
    _save(story)
    return story


def load_story(story_id: str) -> Optional[dict]:
    path = _story_path(story_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_story(story: dict) -> dict:
    story["updated_at"] = _now()
    _save(story)
    return story


def delete_story(story_id: str) -> bool:
    path = _story_path(story_id)
    if os.path.exists(path):
        os.remove(path)
        return True
    return False


def list_stories() -> list[dict]:
    stories_dir = _stories_dir()
    summaries = []
    for fname in sorted(os.listdir(stories_dir)):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(stories_dir, fname), "r", encoding="utf-8") as f:
                story = json.load(f)
            summaries.append({
                "id": story["id"],
                "title": story.get("title"),
                "theme": story["theme"],
                "format": story["format"],
                "chapter_count": len(story.get("chapters", [])),
                "created_at": story["created_at"],
                "updated_at": story["updated_at"],
            })
        except Exception:
            continue
    summaries.sort(key=lambda s: s["updated_at"], reverse=True)
    return summaries


def add_character(story: dict, name: str, role: Optional[str], description: str,
                  introduced_in: Optional[int] = None) -> dict:
    char = {
        "id": str(uuid.uuid4()),
        "name": name,
        "role": role,
        "description": description,
        "background": None,
        "personality": None,
        "appearance": None,
        "profile_text": None,
        "introduced_in": introduced_in,
    }
    story["characters"].append(char)
    save_story(story)
    return char


def update_character_profile(story: dict, char_id: str, profile_text: str) -> bool:
    for char in story["characters"]:
        if char["id"] == char_id:
            char["profile_text"] = profile_text
            save_story(story)
            return True
    return False


def add_chapter(story: dict, brief: str, new_character_ids: list[str],
                title: Optional[str] = None) -> dict:
    number = len(story["chapters"]) + 1
    chapter = {
        "number": number,
        "title": title,
        "brief": brief,
        "content": "",
        "new_character_ids": new_character_ids,
        "created_at": _now(),
        "updated_at": _now(),
    }
    story["chapters"].append(chapter)
    save_story(story)
    return chapter


def update_chapter_content(story: dict, chapter_number: int, content: str,
                            title: Optional[str] = None) -> bool:
    for ch in story["chapters"]:
        if ch["number"] == chapter_number:
            ch["content"] = content
            ch["updated_at"] = _now()
            if title is not None:
                ch["title"] = title
            save_story(story)
            return True
    return False


def get_chapter(story: dict, chapter_number: int) -> Optional[dict]:
    for ch in story["chapters"]:
        if ch["number"] == chapter_number:
            return ch
    return None


def _save(story: dict):
    path = _story_path(story["id"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(story, f, ensure_ascii=False, indent=2)
