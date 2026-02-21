# CodeBot — Next.js Frontend

A dark-themed coding assistant UI with a chatbot and contact form, wired to the FastAPI backend.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          ← Root layout + NavBar
│   ├── globals.css         ← All styles (dark terminal theme)
│   ├── page.tsx            ← Home / landing page
│   ├── chat/
│   │   └── page.tsx        ← Chatbot page
│   └── contact/
│       └── page.tsx        ← Contact form page
├── components/
│   ├── NavBar.tsx          ← Top navigation
│   ├── ChatMessageBubble.tsx  ← Renders markdown + code blocks
│   └── CodeBlock.tsx       ← Syntax-highlighted code with copy button
├── hooks/
│   └── useChat.ts          ← All chat state, session management, API calls
├── lib/
│   └── api.ts              ← Typed API client (matches FastAPI exactly)
└── types/
    └── index.ts            ← TypeScript types mirroring FastAPI models
```

## Quick Start

### 1. Prerequisites
Make sure the FastAPI backend is running on port 8000:
```bash
cd ../backend
uvicorn main:app --reload
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if backend is not on localhost:8000
```

### 4. Run dev server
```bash
npm run dev
# → http://localhost:3000
```

---

## API Alignment

Every call in `src/lib/api.ts` maps exactly to the FastAPI backend:

| Frontend function     | FastAPI endpoint                         | Method |
|-----------------------|------------------------------------------|--------|
| `checkHealth()`       | `/api/health`                            | GET    |
| `submitContact()`     | `/api/contact`                           | POST   |
| `sendChatMessage()`   | `/api/chat`                              | POST   |
| `getChatHistory(id)`  | `/api/chat/{session_id}/history`         | GET    |
| `clearChatSession(id)`| `/api/chat/{session_id}`                 | DELETE |

### Chat session flow
1. First message → no `session_id` sent → backend creates one and returns it
2. All subsequent messages → `session_id` included → backend continues same conversation
3. Clear button → calls DELETE on backend + resets local state

### Contact form fields
All fields match FastAPI `ContactRequest` exactly:
- `name` (required, 2–100 chars, letters/spaces/hyphens only)
- `email` (required, valid email)
- `subject` (required, 3–200 chars)
- `message` (required, 10–2000 chars)
- `phone` (optional, max 20 chars)

---

## Build for Production

```bash
npm run build
npm start
```
