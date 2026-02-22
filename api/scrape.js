const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_PAGES = 3;
const FETCH_TIMEOUT = 5000;
const SKIP_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|pdf|zip|mp4|mp3|css|js|ico|woff|woff2|ttf|eot)$/i;

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0 Safari/537.36',
];

// ─── Fetcher ──────────────────────────────────────────────────────────────────
async function fetchPage(url) {
    try {
        const agent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const resp = await axios.get(url, {
            timeout: FETCH_TIMEOUT,
            headers: {
                'User-Agent': agent,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                Connection: 'keep-alive',
            },
            maxRedirects: 3,
            validateStatus: (s) => s < 400,
        });
        return typeof resp.data === 'string' ? resp.data : null;
    } catch { return null; }
}

// ─── Content Extractor ────────────────────────────────────────────────────────
function extractContent(html, url) {
    const $ = cheerio.load(html);
    $('script, style, noscript, nav, footer, header, iframe, svg, aside, .cookie-banner').remove();

    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';

    const headings = [];
    $('h1, h2, h3').each((_, el) => { const t = $(el).text().trim(); if (t.length > 3) headings.push(t); });

    const paragraphs = [];
    $('p, li, blockquote').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t.length > 30) paragraphs.push(t);
    });

    const reviews = [];
    $('[class*="review"],[class*="testimonial"],[class*="comment"],[itemprop="reviewBody"]').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t.length > 20) reviews.push(t);
    });

    const products = [];
    $('[class*="product"],[class*="plan"],[class*="price"]').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t.length > 10 && t.length < 300) products.push(t);
    });

    return {
        url, title, metaDesc,
        headings: headings.slice(0, 20),
        paragraphs: paragraphs.slice(0, 15),
        reviews: reviews.slice(0, 8),
        products: products.slice(0, 15),
    };
}

// ─── Scraper ──────────────────────────────────────────────────────────────────
async function scrape(domain) {
    let startUrl = domain.trim();
    if (!startUrl.startsWith('http')) startUrl = 'https://' + startUrl;
    startUrl = startUrl.replace(/\/$/, '');

    const priorityPaths = ['/about', '/products', '/services', '/reviews', '/pricing'];
    const candidates = [startUrl, ...priorityPaths.map(p => startUrl + p)];

    const results = await Promise.allSettled(
        candidates.slice(0, 6).map(async (url) => {
            const html = await fetchPage(url);
            if (!html) return null;
            return extractContent(html, url);
        })
    );

    return results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
        .slice(0, 3);
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────
function buildPrompt(pages, domain) {
    const sections = pages.map(p => [
        `=== PAGE: ${p.url} ===`,
        `Title: ${p.title}`,
        `Meta: ${p.metaDesc}`,
        `Headings: ${p.headings.join(' | ')}`,
        `Content: ${p.paragraphs.join(' ')}`,
        `Reviews: ${p.reviews.join(' ')}`,
        `Products: ${p.products.join(' ')}`,
    ].join('\n')).join('\n\n');

    const schema = {
        summary: "3-4 sentence comprehensive overview",
        targetAudience: "customer persona details",
        sentiment: "positive|neutral|negative",
        sentimentReason: "evidence",
        customerNeeds: [{ need: "need", evidence: "ref", priority: "high|medium|low" }],
        customerProblems: [{ problem: "pain point", severity: "critical|high|medium|low", context: "where" }],
        businessSolutions: [{ solution: "how they solve it", targetsProblem: "problem", effectiveness: "rating" }],
        customerIssues: [{ issue: "complaint", frequency: "high|medium|low", category: "pricing|support|product|delivery|other" }],
        keywords: [{ keyword: "key term", rank: 1, frequency: "high|medium|low", category: "product|feature|pain-point|location|brand" }],
        mostSearchedTopics: [{ topic: "search topic", rank: 1, evidence: "why" }],
        areasOfInterest: [{ topic: "topic", frequency: "high|medium|low" }],
        geographicInsights: { countries: [], states: [], cities: [] },
        demandSignals: [{ signal: "demand", description: "context" }],
        trendChanges: [{ trend: "shift", direction: "rising|falling|stable", description: "details" }],
        topProducts: [{ name: "item", category: "cat", description: "desc" }],
    };

    return `You are a world-class market research analyst. Extensively analyze the scraped content from "${domain}".

STRICT QUANTITY RULES:
1. KEYWORDS: Provide EXACTLY 10-15 ranked items.
2. ALL OTHER ARRAY FIELDS: Provide EXACTLY 5-8 descriptive entries each (Needs, Problems, Solutions, Issues, Topics, Interests, Signals, Trends, Products).

JSON RULES:
- Return ONLY the JSON object. 
- NO conversational text before or after the JSON.
- NO commentary or apology.
- Ensure all quotes inside JSON are properly escaped.

CONTENT:
${sections}

SCHEMA TO FOLLOW:
${JSON.stringify(schema, null, 2)}`;
}

// ─── JSON Extractor ───────────────────────────────────────────────────────────
function extractJson(text) {
    try {
        // Find the broad range of the JSON object
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON structure found');

        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error('Failed to parse AI response as JSON: ' + text.slice(0, 150));
    }
}

// ─── Groq Fallback ────────────────────────────────────────────────────────────
function groqRequest(apiKey, prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4096,
        });
        const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(body),
            },
        };
        const req = https.request(options, (resp) => {
            let data = '';
            resp.on('data', chunk => { data += chunk; });
            resp.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) reject(new Error(json.error.message || 'Groq API error'));
                    else resolve(json.choices[0]?.message?.content?.trim() || '');
                } catch (e) { reject(new Error('Failed to parse Groq response')); }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(new Error('Groq request timed out')); });
        req.write(body);
        req.end();
    });
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────
async function analyze(pages, domain) {
    const prompt = buildPrompt(pages, domain);
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const groqKey = (process.env.GROQ_API_KEY || '').trim();

    if (geminiKey) {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

        for (const modelName of MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                return extractJson(result.response.text());
            } catch (err) {
                console.warn(`[AI] ${modelName} failed, trying next...`);
                continue;
            }
        }
    }

    if (groqKey) {
        try {
            console.log(`[AI] Falling back to Groq...`);
            const text = await groqRequest(groqKey, prompt);
            return extractJson(text);
        } catch (err) {
            throw new Error(`AI failed: ${err.message}`);
        }
    }

    throw new Error('All AI models reached quota limits.');
}

// ─── Vercel Handler ───────────────────────────────────────────────────────────
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { domain } = req.body || {};
    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    try {
        const pages = await scrape(domain);
        if (pages.length === 0) return res.status(422).json({ error: `Access denied for ${domain}.` });

        const data = await analyze(pages, domain);
        res.json({ domain, pagesAnalyzed: pages.length, scrapedAt: new Date().toISOString(), ...data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
