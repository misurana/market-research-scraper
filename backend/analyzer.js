const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

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
- NO conversational text.
- Ensure all quotes inside JSON are properly escaped.

CONTENT:
${sections}

SCHEMA:
${JSON.stringify(schema, null, 2)}`;
}

function extractJson(text) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON found');
    return JSON.parse(text.substring(start, end + 1));
  } catch (e) { throw new Error('Invalid JSON: ' + e.message); }
}

async function analyze(pages, domain) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured in .env');

  const genAI = new GoogleGenerativeAI(apiKey);
  const MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

  for (const modelName of MODELS) {
    try {
      console.log(`[AI] Attempting ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(buildPrompt(pages, domain));
      return extractJson(result.response.text());
    } catch (err) {
      console.warn(`[AI] ${modelName} failed:`, err.message);
      continue;
    }
  }
  throw new Error('All AI models failed.');
}

module.exports = { analyze };
