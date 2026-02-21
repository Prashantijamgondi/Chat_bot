import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="hero">
        <div className="hero-badge">Powered by ijp </div>
        <h1>
          Your AI<br />
          <span className="gradient-text">Coding Assistant</span>
        </h1>
        <p>
          Ask questions, debug code, understand patterns — all in a chat interface
          backed by a production FastAPI + OpenRouter backend.
        </p>
        <div className="hero-actions">
          <Link href="/chat" className="btn-primary">
            Start Coding
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link href="/contact" className="btn-secondary">
            Contact Us
          </Link>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Multi-turn Chat</h3>
          <p>Maintains full conversation context via session IDs across requests.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3>Syntax Highlighting</h3>
          <p>Beautiful code blocks with line numbers and one-click copy.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌐</div>
          <h3>Language Hints</h3>
          <p>Tell the assistant your preferred language for tailored responses.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📬</div>
          <h3>Contact Form</h3>
          <p>Validated contact submissions with ticket IDs, backed by FastAPI.</p>
        </div>
      </div>
    </div>
  );
}
