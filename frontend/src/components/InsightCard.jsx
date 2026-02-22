import React from 'react';

export default function InsightCard({ icon, title, color = 'var(--accent-primary)', children, count }) {
    return (
        <div className="insight-card">
            <div className="card-header">
                <div
                    className="card-icon"
                    style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                    aria-hidden="true"
                >
                    {icon}
                </div>
                <h3>{title}</h3>
                {count != null && <span className="card-count">{count}</span>}
            </div>
            {children}
        </div>
    );
}
