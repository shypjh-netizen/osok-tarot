import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

async function logToken({ type, ok, input = 0, output = 0 }) {
  try {
    const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const pipe = redis.pipeline();
    pipe.incr(`funnel:tok:${date}:${type}:count`);
    pipe.expire(`funnel:tok:${date}:${type}:count`, 86400 * 90);
    if (ok) {
      pipe.incrby(`funnel:tok:${date}:${type}:input`, input);
      pipe.incrby(`funnel:tok:${date}:${type}:output`, output);
      pipe.incr(`funnel:tok:${date}:${type}:ok`);
      pipe.expire(`funnel:tok:${date}:${type}:input`, 86400 * 90);
      pipe.expire(`funnel:tok:${date}:${type}:output`, 86400 * 90);
      pipe.expire(`funnel:tok:${date}:${type}:ok`, 86400 * 90);
    } else {
      pipe.incr(`funnel:tok:${date}:${type}:fail`);
      pipe.expire(`funnel:tok:${date}:${type}:fail`, 86400 * 90);
    }
    await pipe.exec();
  } catch { /* 기록 실패가 리딩에 영향 없도록 */ }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const { messages, system, _trackMeta } = body || {};
  const readingType = _trackMeta?.type || 'free';

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
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
      logToken({ type: readingType, ok: false });
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const usage = data.usage || {};
    logToken({
      type: readingType,
      ok: true,
      input: usage.input_tokens || 0,
      output: usage.output_tokens || 0,
    });

    return res.status(200).json({ content: data.content[0].text });
  } catch (e) {
    logToken({ type: readingType, ok: false });
    return res.status(500).json({ error: e.message });
  }
}
