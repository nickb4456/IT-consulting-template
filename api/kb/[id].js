// Vercel Edge Function to get single article content
// Only fetches one article at a time - prevents bulk download

export const config = { runtime: 'edge' };

import kbIndex from '../../kb-index.json';

export default async function handler(req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Extract ID from URL
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const idParam = pathParts[pathParts.length - 1];
  const id = parseInt(idParam, 10);

  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid article ID' }), {
      status: 400,
      headers,
    });
  }

  const article = kbIndex.entries.find(a => a.id === id);

  if (!article) {
    return new Response(JSON.stringify({ error: 'Article not found' }), {
      status: 404,
      headers,
    });
  }

  // Return full article content
  return new Response(JSON.stringify({
    id: article.id,
    path: article.path,
    title: article.title,
    category: article.category,
    icon: article.icon,
    keywords: article.keywords,
    content: article.content,
  }), { headers });
}
