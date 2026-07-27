import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const CID = 'CT23756943';
const BASE_URL = 'https://osok-tarot.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { pg_token, order_id, token } = req.query;

  if (!pg_token || !order_id || !token) {
    return res.redirect(`${BASE_URL}/?payment=fail`);
  }

  try {
    const pending = await redis.get(`kp:${order_id}`);
    if (!pending || pending.accessToken !== token) {
      return res.redirect(`${BASE_URL}/?payment=fail`);
    }

    const approveRes = await fetch('https://open-api.kakaopay.com/online/v1/payment/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SECRET_KEY ${process.env.KAKAOPAY_SECRET_KEY}`,
      },
      body: JSON.stringify({
        cid: CID,
        tid: pending.tid,
        partner_order_id: order_id,
        partner_user_id: 'osok_tarot',
        pg_token,
      }),
    });

    if (!approveRes.ok) {
      return res.redirect(`${BASE_URL}/?payment=fail`);
    }

    // 결제 완료 — 액세스 토큰을 주문 코드로 저장 (7일)
    // webhook GET /api/webhook?code={token} 으로 조회 가능
    await redis.set(`order:${token}`, { product: pending.product }, { ex: 604800 });
    await redis.del(`kp:${order_id}`);

    return res.redirect(`${BASE_URL}/?kp_token=${token}`);
  } catch (e) {
    return res.redirect(`${BASE_URL}/?payment=fail`);
  }
}
