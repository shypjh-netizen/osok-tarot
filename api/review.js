import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // 후기 목록 조회
  if (req.method === 'GET') {
    const reviews = await redis.lrange('reviews', 0, 19); // 최근 20개
    return res.status(200).json({ reviews });
  }

  // 후기 저장
  if (req.method === 'POST') {
    const { rating, content } = req.body;
    if (!content || !rating) return res.status(400).json({ error: 'missing fields' });

    const review = {
      rating: Math.min(5, Math.max(1, Number(rating))),
      content: content.slice(0, 200),
      date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
    };

    await redis.lpush('reviews', review);
    await redis.ltrim('reviews', 0, 99); // 최대 100개 유지

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
