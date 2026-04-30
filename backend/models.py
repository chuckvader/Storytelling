from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CharacterBase(BaseModel):
    name: str
    role: Optional[str] = None
    description: str  # user-provided raw description


class CharacterProfile(BaseModel):
    id: str
    name: str
    role: Optional[str] = None
    background: Optional[str] = None
    personality: Optional[str] = None
    appearance: Optional[str] = None
    profile_text: Optional[str] = None
    introduced_in: Optional[int] = None  # chapter number, None = setup phase


class CreateStoryRequest(BaseModel):
    theme: str
    format: str  # "episodic" | "oneshot"
    model: str = "llama3"
    title: Optional[str] = None


class AddCharacterRequest(BaseModel):
    name: str
    role: Optional[str] = None
    description: str
    introduced_in: Optional[int] = None


class AddChapterRequest(BaseModel):
    brief: str
    new_character_ids: list[str] = Field(default_factory=list)
    title: Optional[str] = None


class EditPassageRequest(BaseModel):
    selected_text: str
    start_offset: int
    end_offset: int
    comment: str


class UpdateChapterRequest(BaseModel):
    content: str
    title: Optional[str] = None


class StorySummary(BaseModel):
    id: str
    title: Optional[str]
    theme: str
    format: str
    chapter_count: int
    created_at: str
    updated_at: str
