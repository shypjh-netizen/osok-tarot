import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

function verifySignature(secret, timestamp, rawBody, signature, signaturePrev) {
  const message = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  if (expected === signature) return true;
  if (signaturePrev) {
    const expectedPrev = crypto.createHmac('sha256', signaturePrev).update(message).digest('hex');
    if (expectedPrev === signature) return true;
  }
  return false;
}

export default async function handler(req, res) {
  // 주문번호 검증 요청 (프론트엔드에서 호출)
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ valid: false });

    const data = await redis.get(`order:${code}`);
    if (!data) return res.status(200).json({ valid: false });

    await redis.del(`order:${code}`); // 1회 사용 후 삭제
    return res.status(200).json({ valid: true, product: data.product });
  }

  // 그로블 웹훅 수신 (POST)
  if (req.method === 'POST') {
    try {
      const signature = req.headers['x-groble-signature'];
      const signaturePrev = req.headers['x-groble-signature-previous'];
      const timestamp = req.headers['x-groble-timestamp'];
      const idempotencyKey = req.headers['x-groble-idempotency-key'];
      const secret = process.env.GROBLE_WEBHOOK_SECRET;

      // 서명 검증
      if (secret && signature && timestamp) {
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - Number(timestamp)) > 300) {
          return res.status(400).json({ error: 'Timestamp expired' });
        }
        const rawBody = JSON.stringify(req.body);
        if (!verifySignature(secret, timestamp, rawBody, signature, signaturePrev)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      // 중복 처리 방지
      if (idempotencyKey) {
        const already = await redis.get(`idem:${idempotencyKey}`);
        if (already) return res.status(200).json({ ok: true });
        await redis.set(`idem:${idempotencyKey}`, 1, { ex: 86400 });
      }

      const body = req.body;

      // 결제 완료 이벤트만 처리
      if (body.type !== 'payment.completed') {
        return res.status(200).json({ ok: true });
      }

      const obj = body.data?.object || {};
      const orderCode = obj.merchantUid || '';        // 최상위 필드
      const productName = obj.content?.title || '';   // content 안 필드

      if (orderCode) {
        await redis.set(`order:${orderCode}`, { product: productName }, { ex: 86400 });
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
