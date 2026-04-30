MAX_FULL_CHAPTERS = 3  # include full text for the most recent N chapters


def build_character_profile_prompt(theme: str, name: str, role: str | None,
                                   description: str) -> str:
    role_str = f" ({role})" if role else ""
    return (
        f"You are a creative writing assistant helping to develop characters for a story.\n\n"
        f"Story theme: {theme}\n\n"
        f"Create a detailed character profile for {name}{role_str}.\n"
        f"User's description: {description}\n\n"
        f"Write the profile as flowing prose (2-3 paragraphs). Cover: background and history, "
        f"personality traits and quirks, physical appearance, and how they fit into the story's world. "
        f"Be specific and vivid. Do not use bullet points or headers."
    )


def build_chapter_prompt(story: dict, brief: str, chapter_number: int) -> str:
    theme = story["theme"]
    fmt = story["format"]
    characters = story["characters"]
    chapters = story["chapters"]

    parts = [
        f"You are a skilled fiction writer.\n\n",
        f"Story theme: {theme}\n",
        f"Format: {'episodic (multiple chapters)' if fmt == 'episodic' else 'one-shot story'}\n\n",
    ]

    if characters:
        parts.append("## Characters\n")
        for char in characters:
            profile = char.get("profile_text") or char.get("description", "")
            introduced = char.get("introduced_in")
            note = f" (introduced in chapter {introduced})" if introduced else " (main cast)"
            parts.append(f"**{char['name']}**{note}: {profile}\n\n")

    existing = [ch for ch in chapters if ch["number"] < chapter_number and ch.get("content")]
    if existing:
        parts.append("## Previous Chapters\n")
        recent = existing[-MAX_FULL_CHAPTERS:]
        older = existing[:-MAX_FULL_CHAPTERS]
        for ch in older:
            parts.append(f"Chapter {ch['number']} summary: {ch.get('brief', '')}\n")
        for ch in recent:
            parts.append(f"\n### Chapter {ch['number']}: {ch.get('title') or 'Untitled'}\n")
            parts.append(ch["content"] + "\n")

    parts.append(f"\n## Your Task\n")
    parts.append(
        f"Write chapter {chapter_number} of this story. "
        f"What happens in this chapter: {brief}\n\n"
        f"Write in a literary fiction style. Use vivid prose, natural dialogue, and strong scene-setting. "
        f"The chapter should be 600-1200 words. Do not include a chapter heading in your response — "
        f"start directly with the prose."
    )

    return "".join(parts)


def build_edit_prompt(story: dict, chapter: dict, selected_text: str, comment: str) -> str:
    theme = story["theme"]
    characters = story["characters"]
    full_content = chapter["content"]

    char_lines = []
    for char in characters:
        profile = char.get("profile_text") or char.get("description", "")
        char_lines.append(f"- {char['name']}: {profile[:200]}...")

    char_section = "\n".join(char_lines) if char_lines else "None"

    return (
        f"You are a creative writing editor.\n\n"
        f"Story theme: {theme}\n"
        f"Characters:\n{char_section}\n\n"
        f"Here is the full chapter:\n\"\"\"\n{full_content}\n\"\"\"\n\n"
        f"The author wants to revise ONLY this specific passage:\n"
        f"\"\"\"\n{selected_text}\n\"\"\"\n\n"
        f"Their revision instruction: {comment}\n\n"
        f"Write ONLY the replacement passage. Maintain the same narrative voice and tense. "
        f"Ensure it flows naturally with the surrounding text. "
        f"Do not include any commentary, explanation, or surrounding context — "
        f"output only the revised passage text."
    )
