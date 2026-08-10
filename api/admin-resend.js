import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const BASE_URL = 'https://osok-tarot.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // 간단한 관리자 인증
  const { secret, email, tier } = req.query;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!email) return res.status(400).json({ error: 'email required' });

  const key = `saju_pending:${email.toLowerCase().trim()}`;
  const sajuData = await redis.get(key);

  if (!sajuData) {
    return res.status(200).json({
      found: false,
      message: `Redis에 ${email} 데이터 없음. 24시간 만료됐거나 저장 안 됨.`,
    });
  }

  const isPremium = (tier || sajuData.tier || 'basic') === 'premium';

  // 이메일 재발송
  const emailRes = await fetch(`${BASE_URL}/api/saju-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toLowerCase().trim(), sajuData, isPremium }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    return res.status(500).json({ found: true, sent: false, error: err });
  }

  return res.status(200).json({
    found: true,
    sent: true,
    tier: isPremium ? 'premium' : 'basic',
    name: sajuData.name,
    message: `${sajuData.name}님(${email})께 이메일 발송 완료`,
  });
}
