import React, { useState } from 'react';
import './index.css';
import Loader from './components/Loader';
import ResultsDashboard from './components/ResultsDashboard';

const API_BASE = import.meta.env.VITE_API_URL || '';

const LOADER_STEPS = 5;

export default function App() {
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [loaderStep, setLoaderStep] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function handleAnalyze(e) {
    e.preventDefault();
    const cleaned = domain.trim().replace(/^https?:\/\//i, '');
    if (!cleaned) return;

    setStatus('loading');
    setData(null);
    setError('');
    setLoaderStep(0);

    // Simulate step progression while waiting
    const interval = setInterval(() => {
      setLoaderStep((prev) => {
        if (prev < LOADER_STEPS - 2) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 2400);

    try {
      const res = await fetch(`${API_BASE}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleaned }),
      });

      clearInterval(interval);
      setLoaderStep(LOADER_STEPS - 1);

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analysis failed');

      setTimeout(() => {
        setData(json);
        setStatus('done');
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-badge">
            <span>🔬</span>
            <span>AI-Powered Market Intelligence</span>
          </div>

          <h1>Market Research<br />at the Speed of AI</h1>

          <p>
            Enter any website domain and get a full market research report —
            customer needs, demand signals, geographic reach, and trends — in seconds.
          </p>

          {/* Input */}
          <form onSubmit={handleAnalyze} aria-label="Domain analysis form">
            <div className="input-wrapper">
              <div className="domain-icon" aria-hidden="true">🌐</div>
              <input
                id="domain-input"
                className="domain-input"
                type="text"
                placeholder="shopify.com, amazon.com, ..."
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={status === 'loading'}
                autoComplete="off"
                spellCheck={false}
                aria-label="Website domain to analyze"
              />
              <button
                id="analyze-btn"
                type="submit"
                className="analyze-btn"
                disabled={status === 'loading' || !domain.trim()}
              >
                {status === 'loading' ? (
                  <>⏳ Analyzing...</>
                ) : (
                  <>🔍 Analyze</>
                )}
              </button>
            </div>
          </form>

          {/* Error */}
          {status === 'error' && (
            <div className="error-box" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      </header>

      {/* Loader */}
      {status === 'loading' && (
        <div className="container">
          <Loader step={loaderStep} />
        </div>
      )}

      {/* Results */}
      {status === 'done' && data && <ResultsDashboard data={data} />}
    </div>
  );
}
