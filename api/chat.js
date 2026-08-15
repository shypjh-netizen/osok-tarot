export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ error: 'body parse failed', raw: body.slice(0,100) });
    }
  }
  if (!body) {
    return res.status(400).json({ error: 'body is null/undefined' });
  }

  const { messages, system } = body;

  if (!messages || !Array.isArray(messages)) {
    console.error('[chat] 400 body:', JSON.stringify({ bodyType: typeof req.body, keys: body ? Object.keys(body) : null }));
    return res.status(400).json({ error: 'messages array required', bodyKeys: body ? Object.keys(body) : null });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: system || '',
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.status(200).json({ content: data.content[0].text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
