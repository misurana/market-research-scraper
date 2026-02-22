import React from 'react';

const STEPS = [
    'Connecting to domain...',
    'Crawling pages...',
    'Extracting market signals...',
    'Running AI analysis...',
    'Building your report...',
];

export default function Loader({ step = 0 }) {
    return (
        <div className="loader-wrapper" role="status" aria-live="polite">
            <div className="loader-orb" aria-hidden="true" />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1rem' }}>
                Analyzing market data...
            </p>
            <div className="loader-steps">
                {STEPS.map((s, i) => (
                    <div
                        key={s}
                        className={`loader-step ${i < step ? 'done' : i === step ? 'active' : ''}`}
                    >
                        <span>{i < step ? '✓' : i === step ? '◉' : '○'}</span>
                        <span>{s}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
