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
  // 이메일 또는 주문번호로 검증 (프론트엔드에서 호출)
  if (req.method === 'GET') {
    const { code, email } = req.query;

    // 이메일로 조회
    if (email) {
      const key = `email:${email.toLowerCase().trim()}`;
      const data = await redis.get(key);
      if (!data) return res.status(200).json({ valid: false });
      return res.status(200).json({ valid: true, product: data.product, code: data.code });
    }

    // 주문번호로 조회 (기존 방식 유지)
    if (!code) return res.status(400).json({ valid: false });
    const data = await redis.get(`order:${code}`);
    if (!data) return res.status(200).json({ valid: false });
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
      const orderCode = obj.merchantUid || '';
      const productName = obj.content?.title || '';
      const email = obj.buyer?.email?.toLowerCase().trim() || '';

      // 사주 결제 처리
      if (productName.includes('사주') && email) {
        const sajuData = await redis.get(`saju_pending:${email}`);
        if (sajuData) {
          // 빠르게 200 반환 후 이메일 발송 (fire & forget)
          res.status(200).json({ ok: true });
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://osok-tarot.vercel.app';
          fetch(`${baseUrl}/api/saju-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sajuData }),
          }).catch(() => {});
          return;
        }
      }

      if (orderCode) {
        await redis.set(`order:${orderCode}`, { product: productName }, { ex: 86400 });
      }
      // 이메일로도 저장 (7일 유지)
      if (email) {
        await redis.set(`email:${email}`, { product: productName, code: orderCode }, { ex: 604800 });
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
