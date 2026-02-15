// Vercel Edge Function for KB search
// Full index stays server-side, only matching results returned

export const config = { runtime: 'edge' };

// Import the full index at build time (stays server-side)
import kbIndex from '../../kb-index.json';

export default async function handler(req) {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { query = '', category = '', type = '', limit = 30 } = body;

    let results = kbIndex.entries;

    // Filter by type (troubleshooting, techniques, patterns)
    if (type) {
      results = results.filter(a => a.path.startsWith(type));
    }

    // Filter by category
    if (category) {
      results = results.filter(a => a.category === category);
    }

    // Search query
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(a => {
        const searchText = (
          a.title + ' ' + 
          a.summary + ' ' + 
          a.keywords.join(' ') + ' ' +
          a.content
        ).toLowerCase();
        return searchText.includes(q);
      });

      // Score and sort by relevance
      results = results.map(a => {
        let score = 0;
        const titleLower = a.title.toLowerCase();
        const summaryLower = a.summary.toLowerCase();
        
        // Title exact match = highest
        if (titleLower === q) score += 100;
        // Title contains query
        else if (titleLower.includes(q)) score += 50;
        // Summary contains query
        if (summaryLower.includes(q)) score += 20;
        // Keywords contain query
        if (a.keywords.some(k => k.toLowerCase().includes(q))) score += 30;
        // Content match (lower weight)
        if (a.content.toLowerCase().includes(q)) score += 5;
        
        return { ...a, score };
      });

      results.sort((a, b) => b.score - a.score);
    }

    // Limit results
    results = results.slice(0, limit);

    // Strip full content from response (only send snippets)
    const safeResults = results.map(({ content, embedding, score, ...rest }) => ({
      ...rest,
      // Create snippet from content (first 300 chars)
      snippet: content ? content.substring(0, 300).replace(/[#\n]+/g, ' ').trim() + '...' : rest.summary,
      relevance: score || 0,
    }));

    return new Response(JSON.stringify({
      count: safeResults.length,
      totalAvailable: kbIndex.entries.length,
      results: safeResults,
    }), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers,
    });
  }
}
