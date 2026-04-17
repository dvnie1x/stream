/**
 * stream. — Notion Proxy Worker
 * Deploy this to Cloudflare Workers.
 * It proxies requests to the Notion API, bypassing browser CORS restrictions.
 * Your Notion token is sent from your browser to this worker, then to Notion.
 * The worker never stores your token.
 */
export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { token, dbId } = body;
    if (!token || !dbId) {
      return new Response(JSON.stringify({ error: 'Missing token or dbId' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Query the Notion database (fetch up to 100 pages)
    let notionRes;
    try {
      notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100 }),
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to reach Notion: ' + e.message }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const data = await notionRes.json();
    return new Response(JSON.stringify(data), {
      status: notionRes.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
