# 🚀 Coding Assistant API — FastAPI + Claude LLM

A production-ready FastAPI backend with a **contact form endpoint** and an **LLM-powered coding chatbot** backed by Anthropic Claude.

---

## 📁 File Structure

```
.
├── main.py            ← FastAPI application (all endpoints)
├── requirements.txt   ← Python dependencies
├── .env.example       ← Environment variable template
└── README.md
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Open .env and set your ANTHROPIC_API_KEY
```

### 3. Run the server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Open interactive docs
- Swagger UI → http://localhost:8000/docs
- ReDoc      → http://localhost:8000/redoc

---

## 🔌 API Endpoints

### System

| Method | Path          | Description        |
|--------|---------------|--------------------|
| GET    | `/api/health` | Health + config check |

### Contact Form

| Method | Path           | Description                  |
|--------|----------------|------------------------------|
| POST   | `/api/contact` | Submit a contact message     |
| GET    | `/api/contact` | List submissions (admin use) |

#### POST `/api/contact` — Request Body
```json
{
  "name":    "Jane Doe",
  "email":   "jane@example.com",
  "subject": "API Question",
  "message": "Hello, I would like to...",
  "phone":   "+1-800-555-0100"   // optional
}
```

#### Response
```json
{
  "success": true,
  "message": "Your message has been received...",
  "ticket_id": "TKT-A3F8B21C",
  "submitted_at": "2025-01-15T10:30:00Z"
}
```

---

### Coding Chatbot

| Method | Path                              | Description               |
|--------|-----------------------------------|---------------------------|
| POST   | `/api/chat`                       | Send a message            |
| GET    | `/api/chat/{session_id}/history`  | Get conversation history  |
| DELETE | `/api/chat/{session_id}`          | Clear a session           |

#### POST `/api/chat` — Request Body
```json
{
  "message":    "How do I reverse a string in Python?",
  "session_id": "optional-uuid-to-continue-conversation",
  "language":   "python"
}
```

#### Response
```json
{
  "reply":      "You can reverse a string in Python using...\n```python\ns = 'hello'\nprint(s[::-1])\n```",
  "session_id": "3f8a1b2c-...",
  "model":      "claude-sonnet-4-6",
  "usage":      { "input_tokens": 120, "output_tokens": 85 }
}
```

---

## 🧪 Example cURL Calls

```bash
# Health check
curl http://localhost:8000/api/health

# Contact form
curl -X POST http://localhost:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","subject":"Hi","message":"Just testing the API!"}'

# Start a chat session
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is a Python decorator?","language":"python"}'

# Continue the same session (use session_id from above response)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Can you give me a real-world example?","session_id":"YOUR-SESSION-ID"}'
```

---

## 🏗️ Production Checklist

- [ ] Replace in-memory stores with PostgreSQL / Redis
- [ ] Add JWT authentication to admin routes
- [ ] Rate-limit `/api/chat` per IP
- [ ] Restrict CORS `allow_origins` to your domain
- [ ] Add email notification for contact submissions (e.g., SendGrid)
- [ ] Deploy with Docker + Gunicorn behind Nginx
- [ ] Set `ANTHROPIC_API_KEY` as a secure environment secret

---

## 🐳 Docker (optional)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t coding-api .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=sk-ant-... coding-api
```
