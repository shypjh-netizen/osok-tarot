import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const CID = 'CT23756943';
const BASE_URL = 'https://osok-tarot.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { pg_token, order_id, token } = req.query;

  if (!pg_token || !order_id || !token) {
    return res.redirect(`${BASE_URL}/saju.html?payment=fail`);
  }

  try {
    const pending = await redis.get(`kp_saju:${order_id}`);
    if (!pending || pending.accessToken !== token) {
      return res.redirect(`${BASE_URL}/saju.html?payment=fail`);
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
        partner_user_id: 'osok_saju',
        pg_token,
      }),
    });

    if (!approveRes.ok) {
      return res.redirect(`${BASE_URL}/saju.html?payment=fail`);
    }

    const { email, tier } = pending;

    // Redis에서 사주 데이터 조회
    const sajuData = await redis.get(`saju_pending:${email}`);
    if (!sajuData) {
      // 사주 데이터 없으면 success 표시만 (이메일 발송 불가)
      return res.redirect(`${BASE_URL}/saju.html?payment=success&email=${encodeURIComponent(email)}&no_data=1`);
    }

    const isPremium = tier === 'premium';

    // 이메일 발송 (fire & forget)
    fetch(`${BASE_URL}/api/saju-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sajuData, isPremium }),
    }).catch(() => {});

    // 대기 데이터 정리
    await redis.del(`kp_saju:${order_id}`);

    return res.redirect(`${BASE_URL}/saju.html?payment=success&email=${encodeURIComponent(email)}`);
  } catch (e) {
    return res.redirect(`${BASE_URL}/saju.html?payment=fail`);
  }
}
