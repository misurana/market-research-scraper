import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InsightCard from './InsightCard';
import GeoSection from './GeoSection';

function sentimentClass(s) {
    if (s === 'positive') return 'sentiment-positive';
    if (s === 'negative') return 'sentiment-negative';
    return 'sentiment-neutral';
}
function sentimentEmoji(s) {
    if (s === 'positive') return '😊';
    if (s === 'negative') return '😟';
    return '😐';
}
function trendClass(dir) {
    if (dir === 'rising') return 'trend-rising';
    if (dir === 'falling') return 'trend-falling';
    return 'trend-stable';
}
function trendArrow(dir) {
    if (dir === 'rising') return '↑';
    if (dir === 'falling') return '↓';
    return '→';
}
function freqClass(f) {
    if (f === 'high') return 'freq-high';
    if (f === 'low') return 'freq-low';
    return 'freq-medium';
}
function severityColor(s) {
    if (s === 'critical') return '#fc8181';
    if (s === 'high') return '#f6ad55';
    if (s === 'medium') return '#f6e05e';
    return '#68d391';
}
function issueColor(cat) {
    const map = { pricing: '#fc8181', support: '#f6ad55', product: '#63b3ed', delivery: '#68d391', other: '#b794f4' };
    return map[cat] || '#b794f4';
}

export default function ResultsDashboard({ data }) {
    const dashRef = useRef(null);

    function exportPDF() {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.getWidth();
        let y = 0;

        // Cover
        doc.setFillColor(13, 15, 20);
        doc.rect(0, 0, W, 297, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 179, 237);
        doc.setFontSize(10);
        doc.text('MARKET RESEARCH REPORT', W / 2, 50, { align: 'center' });
        doc.setTextColor(240, 244, 248);
        doc.setFontSize(26);
        doc.text(data.domain || 'Website Analysis', W / 2, 70, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 174, 192);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date(data.scrapedAt).toLocaleString()}`, W / 2, 82, { align: 'center' });
        doc.text(`Pages Analyzed: ${data.pagesAnalyzed}  |  Sentiment: ${data.sentiment?.toUpperCase()}`, W / 2, 90, { align: 'center' });

        doc.addPage();
        doc.setFillColor(13, 15, 20);
        doc.rect(0, 0, W, 297, 'F');
        y = 20;

        const sectionTitle = (t) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(99, 179, 237);
            doc.setFontSize(12);
            doc.text(t, 14, y);
            y += 6;
            doc.setDrawColor(99, 179, 237);
            doc.setLineWidth(0.3);
            doc.line(14, y, W - 14, y);
            y += 6;
        };
        const bodyText = (t, indent = 14) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(160, 174, 192);
            doc.setFontSize(10);
            const lines = doc.splitTextToSize(t, W - indent - 14);
            doc.text(lines, indent, y);
            y += lines.length * 5 + 3;
            if (y > 270) { doc.addPage(); doc.setFillColor(13, 15, 20); doc.rect(0, 0, W, 297, 'F'); y = 20; }
        };

        sectionTitle('Executive Summary');
        bodyText(data.summary || '');
        if (data.targetAudience) bodyText(`Target Audience: ${data.targetAudience}`);
        y += 4;

        if (data.customerProblems?.length) {
            sectionTitle('Customer Problems');
            autoTable(doc, {
                startY: y,
                head: [['Problem', 'Severity', 'Context']],
                body: data.customerProblems.map(p => [p.problem || p, (p.severity || '').toUpperCase(), p.context || '']),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        if (data.businessSolutions?.length) {
            sectionTitle('Business Solutions');
            autoTable(doc, {
                startY: y,
                head: [['Solution', 'Targets Problem', 'Effectiveness']],
                body: data.businessSolutions.map(s => [s.solution || s, s.targetsProblem || '', s.effectiveness || '']),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        if (data.customerIssues?.length) {
            sectionTitle('Customer Issues & Complaints');
            autoTable(doc, {
                startY: y,
                head: [['Issue', 'Category', 'Frequency']],
                body: data.customerIssues.map(i => [i.issue || i, i.category || '', (i.frequency || '').toUpperCase()]),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        if (data.keywords?.length) {
            sectionTitle('Top Keywords (Ranked)');
            autoTable(doc, {
                startY: y,
                head: [['Rank', 'Keyword', 'Category', 'Frequency']],
                body: data.keywords.slice(0, 15).map(k => [`#${k.rank}`, k.keyword || k, k.category || '', k.frequency || '']),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        if (data.mostSearchedTopics?.length) {
            sectionTitle('Most Searched Topics');
            autoTable(doc, {
                startY: y,
                head: [['Rank', 'Topic', 'Evidence']],
                body: data.mostSearchedTopics.map(t => [`#${t.rank}`, t.topic || t, t.evidence || '']),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        if (data.customerNeeds?.length) {
            sectionTitle('Customer Needs');
            autoTable(doc, {
                startY: y,
                head: [['Need', 'Evidence', 'Priority']],
                body: data.customerNeeds.map(n => [n.need || n, n.evidence || '', (n.priority || '').toUpperCase()]),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        if (data.demandSignals?.length) {
            sectionTitle('Demand Signals');
            autoTable(doc, {
                startY: y,
                head: [['Signal', 'Details']],
                body: data.demandSignals.map(d => [d.signal || d, d.description || '']),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        if (data.trendChanges?.length) {
            sectionTitle('Market Trends');
            autoTable(doc, {
                startY: y,
                head: [['Trend', 'Direction', 'Details']],
                body: data.trendChanges.map(t => [t.trend || t, (t.direction || '').toUpperCase(), t.description || '']),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        const geo = data.geographicInsights;
        if (geo) {
            sectionTitle('Geographic Reach');
            if (geo.countries?.length) bodyText(`Countries: ${geo.countries.join(', ')}`);
            if (geo.states?.length) bodyText(`States/Provinces: ${geo.states.join(', ')}`);
            if (geo.cities?.length) bodyText(`Cities: ${geo.cities.join(', ')}`);
        }

        if (data.topProducts?.length) {
            sectionTitle('Top Products / Services');
            autoTable(doc, {
                startY: y,
                head: [['Product / Service', 'Category', 'Description']],
                body: data.topProducts.map(p => [p.name || p, p.category || '', p.description || '']),
                theme: 'plain',
                styles: { textColor: [160, 174, 192], fontSize: 9, cellPadding: 2 },
                headStyles: { textColor: [240, 244, 248], fontStyle: 'bold' },
                margin: { left: 14, right: 14 },
            });
        }

        doc.save(`market-research-${data.domain?.replace(/[^a-z0-9]/gi, '-')}.pdf`);
    }

    return (
        <section className="dashboard" ref={dashRef}>
            <div className="container">
                {/* Meta header */}
                <div className="dashboard-meta">
                    <h2>Results for <span style={{ color: 'var(--accent-primary)' }}>{data.domain}</span></h2>
                    <div className="meta-tags">
                        <span className="meta-tag">📄 {data.pagesAnalyzed} pages crawled</span>
                        <span className="meta-tag">🕐 {new Date(data.scrapedAt).toLocaleTimeString()}</span>
                        <span className={`sentiment-badge ${sentimentClass(data.sentiment)}`}>
                            {sentimentEmoji(data.sentiment)} {data.sentiment}
                            {data.sentimentReason && <span style={{ fontWeight: 400, opacity: 0.8 }}>— {data.sentimentReason}</span>}
                        </span>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="summary-card">
                    <div className="card-header" style={{ marginBottom: 'calc(var(--space) * 1.5)' }}>
                        <div className="card-icon" style={{ background: 'rgba(99,179,237,0.15)' }}>📊</div>
                        <h3>Executive Summary</h3>
                    </div>
                    <p>{data.summary}</p>
                    {data.targetAudience && (
                        <div className="target-audience">
                            <strong style={{ color: 'var(--accent-secondary)' }}>👤 Target Audience: </strong>
                            {data.targetAudience}
                        </div>
                    )}
                </div>

                {/* ── NEW: Keywords Ranked ── */}
                {data.keywords?.length > 0 && (
                    <InsightCard icon="🔑" title="Top Keywords (Ranked)" color="var(--accent-primary)" count={data.keywords.length}>
                        <div className="keyword-grid">
                            {data.keywords.map((k, i) => (
                                <div key={i} className="keyword-chip">
                                    <span className="keyword-rank">#{k.rank}</span>
                                    <span className="keyword-text">{k.keyword}</span>
                                    <span className="keyword-cat">{k.category}</span>
                                </div>
                            ))}
                        </div>
                    </InsightCard>
                )}

                {/* ── NEW: Most Searched Topics ── */}
                {data.mostSearchedTopics?.length > 0 && (
                    <InsightCard icon="🔍" title="Most Searched Topics" color="var(--accent-secondary)" count={data.mostSearchedTopics.length}>
                        <ol className="ranked-list">
                            {data.mostSearchedTopics.map((t, i) => (
                                <li key={i} className="ranked-item">
                                    <span className="ranked-num">#{t.rank}</span>
                                    <div>
                                        <div className="insight-item-title">{t.topic}</div>
                                        {t.evidence && <div className="insight-item-sub">{t.evidence}</div>}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </InsightCard>
                )}

                <div className="grid-2">
                    {/* ── NEW: Customer Problems ── */}
                    {data.customerProblems?.length > 0 && (
                        <InsightCard icon="⚠️" title="Customer Problems" color="#fc8181" count={data.customerProblems.length}>
                            <ul className="insight-list">
                                {data.customerProblems.map((p, i) => (
                                    <li key={i} className="insight-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span className="severity-badge" style={{ background: severityColor(p.severity) + '22', color: severityColor(p.severity), border: `1px solid ${severityColor(p.severity)}44` }}>
                                                {p.severity || 'medium'}
                                            </span>
                                            <span className="insight-item-title">{p.problem}</span>
                                        </div>
                                        {p.context && <div className="insight-item-sub">{p.context}</div>}
                                    </li>
                                ))}
                            </ul>
                        </InsightCard>
                    )}

                    {/* ── NEW: Business Solutions ── */}
                    {data.businessSolutions?.length > 0 && (
                        <InsightCard icon="💼" title="How They Tackle It" color="var(--accent-green)" count={data.businessSolutions.length}>
                            <ul className="insight-list">
                                {data.businessSolutions.map((s, i) => (
                                    <li key={i} className="insight-item">
                                        <div className="insight-item-title">{s.solution}</div>
                                        {s.targetsProblem && <div className="insight-item-sub">🎯 Targets: {s.targetsProblem}</div>}
                                        {s.effectiveness && <div className="insight-item-sub">📊 {s.effectiveness}</div>}
                                    </li>
                                ))}
                            </ul>
                        </InsightCard>
                    )}

                    {/* ── NEW: Customer Issues / Complaints ── */}
                    {data.customerIssues?.length > 0 && (
                        <InsightCard icon="🔔" title="Customer Issues & Complaints" color="#f6ad55" count={data.customerIssues.length}>
                            <ul className="insight-list">
                                {data.customerIssues.map((issue, i) => (
                                    <li key={i} className="insight-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span className="issue-cat-badge" style={{ background: issueColor(issue.category) + '22', color: issueColor(issue.category), border: `1px solid ${issueColor(issue.category)}44` }}>
                                                {issue.category || 'other'}
                                            </span>
                                            <span className="insight-item-title">{issue.issue}</span>
                                        </div>
                                        <div className="insight-item-sub">Frequency: {issue.frequency}</div>
                                    </li>
                                ))}
                            </ul>
                        </InsightCard>
                    )}

                    {/* Customer Needs */}
                    {data.customerNeeds?.length > 0 && (
                        <InsightCard icon="💡" title="Customer Needs" color="var(--accent-primary)" count={data.customerNeeds.length}>
                            <ul className="insight-list">
                                {data.customerNeeds.map((n, i) => (
                                    <li key={i} className="insight-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            {n.priority && (
                                                <span className="severity-badge" style={{ background: severityColor(n.priority === 'high' ? 'high' : n.priority === 'medium' ? 'medium' : 'low') + '22', color: severityColor(n.priority === 'high' ? 'high' : n.priority === 'medium' ? 'medium' : 'low') }}>
                                                    {n.priority}
                                                </span>
                                            )}
                                            <span className="insight-item-title">{n.need || n}</span>
                                        </div>
                                        {n.evidence && <div className="insight-item-sub">{n.evidence}</div>}
                                    </li>
                                ))}
                            </ul>
                        </InsightCard>
                    )}

                    {/* Areas of Interest */}
                    {data.areasOfInterest?.length > 0 && (
                        <InsightCard icon="🎯" title="Areas of Interest" color="var(--accent-secondary)" count={data.areasOfInterest.length}>
                            <div className="tags-wrap">
                                {data.areasOfInterest.map((a, i) => (
                                    <span key={i} className="tag tag-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        <span className={`freq-dot ${freqClass(a.frequency)}`} />
                                        {a.topic || a}
                                    </span>
                                ))}
                            </div>
                        </InsightCard>
                    )}

                    {/* Demand Signals */}
                    {data.demandSignals?.length > 0 && (
                        <InsightCard icon="📈" title="Demand Signals" color="var(--accent-orange)" count={data.demandSignals.length}>
                            <ul className="insight-list">
                                {data.demandSignals.map((d, i) => (
                                    <li key={i} className="insight-item">
                                        <div className="insight-item-title">{d.signal || d}</div>
                                        {d.description && <div className="insight-item-sub">{d.description}</div>}
                                    </li>
                                ))}
                            </ul>
                        </InsightCard>
                    )}

                    {/* Market Trends */}
                    {data.trendChanges?.length > 0 && (
                        <InsightCard icon="🔄" title="Market Trends & Changes" color="var(--accent-green)" count={data.trendChanges.length}>
                            <ul className="insight-list">
                                {data.trendChanges.map((t, i) => (
                                    <li key={i} className="insight-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span className={`trend-dir ${trendClass(t.direction)}`}>
                                                {trendArrow(t.direction)} {t.direction}
                                            </span>
                                            <span className="insight-item-title">{t.trend || t}</span>
                                        </div>
                                        {t.description && <div className="insight-item-sub">{t.description}</div>}
                                    </li>
                                ))}
                            </ul>
                        </InsightCard>
                    )}

                    {/* Top Products */}
                    {data.topProducts?.length > 0 && (
                        <InsightCard icon="🏆" title="Top Products / Services" color="var(--accent-orange)" count={data.topProducts.length}>
                            <ul className="insight-list">
                                {data.topProducts.map((p, i) => (
                                    <li key={i} className="insight-item">
                                        <div className="insight-item-title">{p.name || p}</div>
                                        {p.category && <div className="insight-item-sub">📁 {p.category}</div>}
                                        {p.description && <div className="insight-item-sub">{p.description}</div>}
                                    </li>
                                ))}
                            </ul>
                        </InsightCard>
                    )}

                    {/* Geographic */}
                    <GeoSection geo={data.geographicInsights} />
                </div>

                {/* Export */}
                <div className="export-row">
                    <button className="export-btn" onClick={exportPDF} aria-label="Export report as PDF">
                        📄 Export PDF Report
                    </button>
                </div>
            </div>
        </section>
    );
}
