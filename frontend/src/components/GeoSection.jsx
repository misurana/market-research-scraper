import React from 'react';
import InsightCard from './InsightCard';

function TagGroup({ label, items, colorClass }) {
    if (!items?.length) return null;
    return (
        <div className="geo-group">
            <div className="geo-label">{label}</div>
            <div className="tags-wrap">
                {items.map((item) => (
                    <span key={item} className={`tag ${colorClass}`}>{item}</span>
                ))}
            </div>
        </div>
    );
}

export default function GeoSection({ geo }) {
    const total = (geo?.countries?.length || 0) + (geo?.states?.length || 0) + (geo?.cities?.length || 0);

    return (
        <div className="geo-card" style={{ gridColumn: '1 / -1' }}>
            <InsightCard icon="🌍" title="Geographic Reach" color="var(--accent-green)" count={total}>
                {total === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No geographic data detected on this site.
                    </p>
                ) : (
                    <>
                        <TagGroup label="🌐 Countries" items={geo?.countries} colorClass="tag-blue" />
                        <TagGroup label="🏛 States / Provinces" items={geo?.states} colorClass="tag-purple" />
                        <TagGroup label="🏙 Cities" items={geo?.cities} colorClass="tag-green" />
                    </>
                )}
            </InsightCard>
        </div>
    );
}
