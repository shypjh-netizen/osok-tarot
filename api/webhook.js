import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // 토큰 검증 요청 (프론트엔드에서 호출)
  if (req.method === 'GET') {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false });

    const data = await redis.get(`token:${token}`);
    if (!data) return res.status(200).json({ valid: false });

    await redis.del(`token:${token}`); // 1회 사용 후 삭제
    return res.status(200).json({ valid: true, product: data.product });
  }

  // 그로블 웹훅 수신 (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // 결제 완료 이벤트만 처리
      if (body.event !== 'payment.completed' && body.event !== 'order.completed') {
        return res.status(200).json({ ok: true });
      }

      // 1회용 토큰 생성 (1시간 유효)
      const token = crypto.randomBytes(32).toString('hex');
      const productName = body.order?.product_name || body.product_name || '';

      await redis.set(`token:${token}`, { product: productName }, { ex: 3600 });

      return res.status(200).json({ ok: true, token });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
