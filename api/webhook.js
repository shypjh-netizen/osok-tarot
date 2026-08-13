import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ valid: false });

  try {
    const order = await redis.get(`order:${code}`);
    if (!order) return res.status(200).json({ valid: false });
    return res.status(200).json({ valid: true, product: order.product || '' });
  } catch (e) {
    return res.status(500).json({ valid: false });
  }
}
