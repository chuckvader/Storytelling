import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

import story_manager as sm
import ollama_client as ollama
import context as ctx
from models import (
    CreateStoryRequest,
    AddCharacterRequest,
    AddChapterRequest,
    EditPassageRequest,
    UpdateChapterRequest,
)

app = FastAPI(title="Story Writing Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── SSE helpers ──────────────────────────────────────────────────────────────

def _sse_event(token: str = "", done: bool = False) -> str:
    return f"data: {json.dumps({'token': token, 'done': done})}\n\n"


async def _stream_to_sse(gen, story: dict, save_fn):
    """Stream tokens, accumulate full text, call save_fn(full_text) when done."""
    accumulated = []
    try:
        async for token in gen:
            accumulated.append(token)
            yield _sse_event(token=token)
    finally:
        full_text = "".join(accumulated)
        if full_text:
            save_fn(full_text)
        yield _sse_event(done=True)


# ── Ollama ────────────────────────────────────────────────────────────────────

@app.get("/api/ollama/models")
async def get_models():
    try:
        models = await ollama.list_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {e}")


# ── Stories ───────────────────────────────────────────────────────────────────

@app.get("/api/stories")
async def list_stories():
    return sm.list_stories()


@app.post("/api/stories", status_code=201)
async def create_story(body: CreateStoryRequest):
    story = sm.create_story(
        theme=body.theme,
        format=body.format,
        model=body.model,
        title=body.title,
    )
    return story


@app.get("/api/stories/{story_id}")
async def get_story(story_id: str):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@app.delete("/api/stories/{story_id}", status_code=204)
async def delete_story(story_id: str):
    if not sm.delete_story(story_id):
        raise HTTPException(status_code=404, detail="Story not found")


# ── Characters ────────────────────────────────────────────────────────────────

@app.post("/api/stories/{story_id}/characters")
async def add_character(story_id: str, body: AddCharacterRequest):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    char = sm.add_character(
        story,
        name=body.name,
        role=body.role,
        description=body.description,
        introduced_in=body.introduced_in,
    )

    prompt = ctx.build_character_profile_prompt(
        theme=story["theme"],
        name=body.name,
        role=body.role,
        description=body.description,
    )

    async def _stream():
        story_ref = sm.load_story(story_id)
        accumulated = []
        try:
            async for token in ollama.stream_generate(prompt, story["model"]):
                accumulated.append(token)
                yield _sse_event(token=token)
        finally:
            full_text = "".join(accumulated)
            if full_text and story_ref:
                sm.update_character_profile(story_ref, char["id"], full_text)
            yield _sse_event(done=True)

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "X-Character-Id": char["id"],
            "Cache-Control": "no-cache",
        },
    )


# ── Chapters ──────────────────────────────────────────────────────────────────

@app.post("/api/stories/{story_id}/chapters", status_code=201)
async def add_chapter(story_id: str, body: AddChapterRequest):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    chapter = sm.add_chapter(
        story,
        brief=body.brief,
        new_character_ids=body.new_character_ids,
        title=body.title,
    )
    return chapter


@app.get("/api/stories/{story_id}/chapters")
async def list_chapters(story_id: str):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return [
        {"number": ch["number"], "title": ch.get("title"), "brief": ch.get("brief")}
        for ch in story["chapters"]
    ]


@app.get("/api/stories/{story_id}/chapters/{chapter_number}")
async def get_chapter(story_id: str, chapter_number: int):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    ch = sm.get_chapter(story, chapter_number)
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return ch


@app.post("/api/stories/{story_id}/chapters/{chapter_number}/generate")
async def generate_chapter(story_id: str, chapter_number: int):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    chapter = sm.get_chapter(story, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    prompt = ctx.build_chapter_prompt(story, chapter["brief"], chapter_number)

    async def _stream():
        story_ref = sm.load_story(story_id)
        accumulated = []
        try:
            async for token in ollama.stream_generate(prompt, story["model"]):
                accumulated.append(token)
                yield _sse_event(token=token)
        finally:
            full_text = "".join(accumulated)
            if full_text and story_ref:
                sm.update_chapter_content(story_ref, chapter_number, full_text)
            yield _sse_event(done=True)

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.patch("/api/stories/{story_id}/chapters/{chapter_number}")
async def update_chapter(story_id: str, chapter_number: int, body: UpdateChapterRequest):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    ok = sm.update_chapter_content(story, chapter_number, body.content, body.title)
    if not ok:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return sm.get_chapter(sm.load_story(story_id), chapter_number)


# ── Targeted edit ─────────────────────────────────────────────────────────────

@app.post("/api/stories/{story_id}/chapters/{chapter_number}/edit")
async def edit_passage(story_id: str, chapter_number: int, body: EditPassageRequest):
    story = sm.load_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    chapter = sm.get_chapter(story, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    content = chapter.get("content", "")
    # Verify the selection still matches the stored content
    actual = content[body.start_offset:body.end_offset]
    if actual != body.selected_text:
        raise HTTPException(
            status_code=409,
            detail="Selection no longer matches chapter content. Please refresh and try again.",
        )

    prompt = ctx.build_edit_prompt(story, chapter, body.selected_text, body.comment)

    async def _stream():
        story_ref = sm.load_story(story_id)
        accumulated = []
        try:
            async for token in ollama.stream_generate(prompt, story["model"]):
                accumulated.append(token)
                yield _sse_event(token=token)
        finally:
            replacement = "".join(accumulated).strip()
            if replacement and story_ref:
                ch = sm.get_chapter(story_ref, chapter_number)
                if ch:
                    new_content = (
                        ch["content"][: body.start_offset]
                        + replacement
                        + ch["content"][body.end_offset :]
                    )
                    sm.update_chapter_content(story_ref, chapter_number, new_content)
            yield _sse_event(done=True)

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


# ── Static frontend (must be last) ────────────────────────────────────────────

_frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_frontend_dist):
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="static")
