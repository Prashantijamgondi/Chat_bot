"""
FastAPI Backend - Coding Assistant Chatbot + Contact API
========================================================
Description: Production-ready FastAPI server with:
    - /api/contact   → Contact form submission endpoint
    - /api/chat      → LLM-powered coding chatbot (OpenRouter)
    - /api/health    → Health check
    - /api/chat/{id}/history → Retrieve chat history
"""

import os
import uuid
import logging
import asyncio
import json
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, validator
import httpx
from dotenv import load_dotenv
from upstash_redis import Redis

load_dotenv() # Load from .env file

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Redis Setup (Upstash)
# ─────────────────────────────────────────────
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

if UPSTASH_URL and UPSTASH_TOKEN:
    redis = Redis.from_env()
    logger.info("Redis connected (Upstash)")
else:
    redis = None
    logger.warning("Redis credentials missing. Persistence is disabled.")
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# Config — OpenRouter ONLY (no Anthropic conflict)
# ─────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL      = "meta-llama/llama-3.3-70b-instruct:free"
MAX_TOKENS         = 2048

ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

SYSTEM_PROMPT = """You are an expert coding  assistant specialized and coding bug fixer in software development.
You help developers with:
- Writing clean, efficient, and well-documented code
- Debugging and troubleshooting errors
- Code reviews and best practices
- Architecture and design patterns
- Explaining complex programming concepts clearly

Always provide working code examples when relevant. Format code blocks with the correct language tag.
Be concise but thorough. If the question is ambiguous, ask for clarification."""

# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="Coding Assistant API",
    description="A FastAPI backend with a contact form and LLM-powered coding chatbot.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis keys prefix
REDIS_CHAT_PREFIX = "chat:"
REDIS_CONTACTS_KEY = "contacts"
REDIS_SESSIONS_KEY = "active_sessions"

# Fallback in-memory stores
memory_chat: dict[str, List[dict]] = {}
memory_contacts: List[dict] = []
memory_sessions: set[str] = set()
# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────

class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, example="Jane Doe")
    email: EmailStr = Field(..., example="jane@example.com")
    subject: str = Field(..., min_length=3, max_length=200, example="Question about API")
    message: str = Field(..., min_length=10, max_length=2000, example="Hello, I'd like to know...")
    phone: Optional[str] = Field(None, max_length=20, example="+1-800-555-0100")

    @validator("name")
    def name_must_be_alphabetic(cls, v):
        if not all(c.isalpha() or c.isspace() or c in "-'" for c in v):
            raise ValueError("Name may only contain letters, spaces, hyphens, or apostrophes.")
        return v.strip()

class ContactResponse(BaseModel):
    success: bool
    message: str
    ticket_id: str
    submitted_at: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, example="How do I reverse a string in Python?")
    session_id: Optional[str] = Field(None, description="Omit to start a new session")
    language: Optional[str] = Field(None, example="python", description="Preferred coding language context")

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    model: str
    usage: dict

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    llm_configured: bool

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def build_system_prompt(language: Optional[str]) -> str:
    base = SYSTEM_PROMPT
    if language:
        base += f"\n\nThe user prefers {language} as their primary language. Prioritize {language} examples unless asked otherwise."
    return base


import asyncio

FREE_MODELS = [
    "openrouter/free",               # auto-router first
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-v3-0324:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "qwen/qwq-32b:free",
]

async def call_llm(messages: List[dict], system: str) -> str:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "CodeBot",
    }

    formatted_messages = [{"role": "system", "content": system}]
    for m in messages:
        formatted_messages.append({"role": m["role"], "content": m["content"]})

    last_error = ""
    for model in FREE_MODELS:
        payload = {
            "model": model,
            "messages": formatted_messages,
            "max_tokens": MAX_TOKENS,
            "temperature": 0.7,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)

        if response.status_code == 200:
            logger.info("Used model: %s", model)
            return response.json()["choices"][0]["message"]["content"]

        last_error = response.text
        logger.warning("Model %s failed (%s), trying next...", model, response.status_code)
        await asyncio.sleep(1)  # small delay between retries

    raise HTTPException(status_code=502, detail=f"All models failed. Last error: {last_error}")
async def call_llm_old(messages: List[dict], system: str) -> str:
    """
    Call OpenRouter API.
    Returns: plain string reply from the model.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "CodeBot",
    }

    # System message first, then clean user/assistant messages
    formatted_messages = [{"role": "system", "content": system}]
    for m in messages:
        formatted_messages.append({
            "role": m["role"],
            "content": m["content"]
        })

    payload = {
        "model": DEFAULT_MODEL,
        "messages": formatted_messages,
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OPENROUTER_URL, headers=headers, json=payload)

    if response.status_code != 200:
        logger.error("OpenRouter error %s: %s", response.status_code, response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenRouter error: {response.text}"
        )

    # Returns plain string
    return response.json()["choices"][0]["message"]["content"]


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat() + "Z",
        llm_configured=bool(OPENROUTER_API_KEY),
    )


# ── Contact ──────────────────────────────────

@app.post("/api/contact", response_model=ContactResponse, status_code=201, tags=["Contact"])
async def submit_contact(payload: ContactRequest):
    ticket_id    = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    submitted_at = datetime.utcnow().isoformat() + "Z"
    record = {"ticket_id": ticket_id, "submitted_at": submitted_at, **payload.dict()}
    
    if redis:
        # Store in Redis (List)
        redis.lpush(REDIS_CONTACTS_KEY, json.dumps(record))
    else:
        memory_contacts.insert(0, record)
    
    logger.info("New contact submission: %s from %s", ticket_id, payload.email)
    return ContactResponse(
        success=True,
        message="Your message has been received. We'll get back to you within 24 hours.",
        ticket_id=ticket_id,
        submitted_at=submitted_at,
    )


@app.get("/api/contact", tags=["Contact"])
async def list_contacts(limit: int = 20):
    if redis:
        # Fetch from Redis
        contacts = redis.lrange(REDIS_CONTACTS_KEY, 0, limit - 1)
        parsed_contacts = []
        for c in contacts:
            if isinstance(c, str):
                parsed_contacts.append(json.loads(c))
            else:
                parsed_contacts.append(c)
        return {"total": redis.llen(REDIS_CONTACTS_KEY), "contacts": parsed_contacts}
    else:
        return {"total": len(memory_contacts), "contacts": memory_contacts[:limit]}


# ── Chatbot ──────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse, tags=["Chatbot"])
async def chat(payload: ChatRequest):
    session_id = payload.session_id or str(uuid.uuid4())
    
    if redis:
        redis_key = f"{REDIS_CHAT_PREFIX}{session_id}"
        history_data = redis.get(redis_key)
        if history_data:
            history = json.loads(history_data) if isinstance(history_data, str) else history_data
        else:
            history = []
            # New session! Track it.
            redis.sadd(REDIS_SESSIONS_KEY, session_id)
    else:
        if session_id not in memory_chat:
            memory_chat[session_id] = []
            memory_sessions.add(session_id)
        history = memory_chat[session_id]

    history.append({"role": "user", "content": payload.message})

    system = build_system_prompt(payload.language)

    # call_llm returns a plain string — use directly
    reply_text = await call_llm(history, system)

    history.append({"role": "assistant", "content": reply_text})

    # Trim history and save back
    if len(history) > 40:
        history = history[-40:]
    
    if redis:
        redis.set(redis_key, json.dumps(history), ex=3600 * 24 * 7) # 7 days expiry
    else:
        memory_chat[session_id] = history

    logger.info("Chat session %s — %d turns", session_id, len(history) // 2)

    return ChatResponse(
        reply=reply_text,
        session_id=session_id,
        model=DEFAULT_MODEL,
        usage={},
    )


@app.get("/api/chat/{session_id}/history", tags=["Chatbot"])
async def get_history(session_id: str):
    if redis:
        redis_key = f"{REDIS_CHAT_PREFIX}{session_id}"
        history_data = redis.get(redis_key)
        if not history_data:
            raise HTTPException(status_code=404, detail="Session not found.")
        history = json.loads(history_data) if isinstance(history_data, str) else history_data
    else:
        if session_id not in memory_chat:
            raise HTTPException(status_code=404, detail="Session not found.")
        history = memory_chat[session_id]
        
    return {"session_id": session_id, "message_count": len(history), "messages": history}


@app.delete("/api/chat/{session_id}", tags=["Chatbot"])
async def clear_session(session_id: str):
    if redis:
        redis_key = f"{REDIS_CHAT_PREFIX}{session_id}"
        redis.delete(redis_key)
        redis.srem(REDIS_SESSIONS_KEY, session_id)
    else:
        if session_id in memory_chat:
            del memory_chat[session_id]
        if session_id in memory_sessions:
            memory_sessions.remove(session_id)
        
    return {"success": True, "message": f"Session {session_id} cleared."}


@app.get("/api/chat/sessions", tags=["Chatbot"])
async def list_sessions():
    if redis:
        sessions = redis.smembers(REDIS_SESSIONS_KEY)
        return {"sessions": sorted(list(sessions), reverse=True)}
    else:
        return {"sessions": sorted(list(memory_sessions), reverse=True)}


# ─────────────────────────────────────────────
# Global exception handler
# ─────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "An internal server error occurred."})


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
