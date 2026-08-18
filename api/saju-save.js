import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, sajuData, tier } = req.body;
  if (!email || !sajuData) return res.status(400).json({ error: 'missing fields' });

  const key = `saju_pending:${email.toLowerCase().trim()}`;
  await redis.set(key, { ...sajuData, tier: tier || 'basic' }, { ex: 86400 }); // 24시간 보관

  return res.status(200).json({ ok: true });
}
