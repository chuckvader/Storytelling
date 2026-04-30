# Story Writing Assistant

A guided story writing app powered by a local Ollama LLM.

## Prerequisites

- [Ollama](https://ollama.com) running locally with at least one model pulled:
  ```
  ollama pull llama3
  ```
- Python 3.11+
- Node.js 18+

## Setup

**Backend**
```bash
pip install -r backend/requirements.txt
```

**Frontend**
```bash
cd frontend && npm install
```

## Running

**Backend** (terminal 1):
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend dev server** (terminal 2):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Production build

```bash
cd frontend && npm run build
# Then just run the backend — it serves the built frontend
cd ../backend && uvicorn main:app --port 8000
# Open http://localhost:8000
```

## Features

- Guided wizard: theme → format (episodic/one-shot) → model selection → characters
- AI-generated character profiles (streamed)
- Chapter-by-chapter writing with full story context
- **Targeted edits**: select any passage of text, leave a comment, and only that part gets rewritten
- Stories saved as JSON files in `stories/`
