const axios = require('axios');
const cheerio = require('cheerio');

const MAX_PAGES = 10;
const TIMEOUT = 10000;

const SKIP_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|pdf|zip|mp4|mp3|css|js|ico|woff|woff2|ttf|eot)$/i;

async function fetchPage(url) {
    try {
        const resp = await axios.get(url, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml',
            },
            maxRedirects: 5,
        });
        return resp.data;
    } catch {
        return null;
    }
}

function extractLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const links = new Set();
    $('a[href]').each((_, el) => {
        try {
            const href = $(el).attr('href');
            const absolute = new URL(href, baseUrl).href;
            if (
                absolute.startsWith(baseUrl) &&
                !SKIP_EXTENSIONS.test(absolute) &&
                !absolute.includes('#') &&
                !absolute.includes('?')
            ) {
                links.add(absolute);
            }
        } catch { }
    });
    return [...links];
}

function extractContent(html, url) {
    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, noscript, nav, footer, header, iframe, svg, aside, .cookie-banner, #cookie').remove();

    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';

    const headings = [];
    $('h1, h2, h3').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 3) headings.push(text);
    });

    const paragraphs = [];
    $('p, li, blockquote, td, th').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.length > 30) paragraphs.push(text);
    });

    // Reviews / testimonials
    const reviews = [];
    $('[class*="review"], [class*="testimonial"], [class*="comment"], [class*="feedback"], [itemprop="reviewBody"]').each(
        (_, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text.length > 20) reviews.push(text);
        }
    );

    // FAQs
    const faqs = [];
    $('[class*="faq"], [class*="accordion"], details').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.length > 20) faqs.push(text);
    });

    // Prices / products
    const products = [];
    $('[class*="product"], [class*="item"], [class*="price"], [class*="plan"]').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.length > 10 && text.length < 300) products.push(text);
    });

    return {
        url,
        title,
        metaDesc,
        headings: headings.slice(0, 20),
        paragraphs: paragraphs.slice(0, 40),
        reviews: reviews.slice(0, 20),
        faqs: faqs.slice(0, 10),
        products: products.slice(0, 20),
    };
}

async function scrape(domain) {
    // Normalize domain
    let startUrl = domain.trim();
    if (!startUrl.startsWith('http')) startUrl = 'https://' + startUrl;
    startUrl = startUrl.replace(/\/$/, '');

    const visited = new Set();
    const queue = [startUrl];
    const pages = [];

    // Priority paths to crawl
    const priorityPaths = [
        '/about', '/about-us', '/products', '/services', '/reviews',
        '/testimonials', '/faq', '/blog', '/pricing', '/contact',
    ];
    for (const path of priorityPaths) {
        queue.push(startUrl + path);
    }

    while (queue.length > 0 && pages.length < MAX_PAGES) {
        const url = queue.shift();
        if (visited.has(url)) continue;
        visited.add(url);

        const html = await fetchPage(url);
        if (!html) continue;

        const content = extractContent(html, url);
        pages.push(content);

        const links = extractLinks(html, startUrl);
        for (const link of links) {
            if (!visited.has(link) && pages.length + queue.length < MAX_PAGES * 3) {
                queue.push(link);
            }
        }
    }

    return pages;
}

module.exports = { scrape };
