require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrape } = require('./scraper');
const { analyze } = require('./analyzer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main scrape endpoint
app.post('/api/scrape', async (req, res) => {
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ error: 'Please provide a valid domain.' });
    }

    try {
        console.log(`[Scraper] Starting crawl for: ${domain}`);
        const pages = await scrape(domain);

        if (pages.length === 0) {
            return res.status(422).json({ error: 'Could not fetch any pages from this domain. Please check the URL.' });
        }

        console.log(`[Scraper] Crawled ${pages.length} pages. Sending to Gemini AI...`);
        const analysis = await analyze(pages, domain);

        res.json({
            domain,
            pagesAnalyzed: pages.length,
            scrapedAt: new Date().toISOString(),
            ...analysis,
        });
    } catch (err) {
        console.error('[Error]', err.message);
        res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
    }
});

app.listen(PORT, () => {
    console.log(`Market Research API running at http://localhost:${PORT}`);
});
