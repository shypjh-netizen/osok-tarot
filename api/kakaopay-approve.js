import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const CID = 'CT23756943';
const BASE_URL = 'https://www.osok.kr';

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

    const approveData = await approveRes.json();

    /* 쿠폰이 있었다면 승인금액 검증 */
    if (pending.coupon && pending.finalAmount !== undefined) {
      const approved = approveData.amount?.total;
      if (approved !== undefined && approved !== pending.finalAmount) {
        console.error(`[kakaopay-approve] 금액 불일치 expected=${pending.finalAmount} approved=${approved}`);
        return res.redirect(`${BASE_URL}/?payment=fail`);
      }
    }

    // 결제 완료 — 액세스 토큰을 주문 코드로 저장 (7일)
    await redis.set(`order:${token}`, { product: pending.product }, { ex: 604800 });
    await redis.del(`kp:${order_id}`);

    /* 쿠폰 확정 */
    if (pending.coupon?.code && pending.userId) {
      try {
        const { code } = pending.coupon;
        const pipe = redis.pipeline();
        pipe.incr(`coupon:user:${code}:${pending.userId}`);
        pipe.expire(`coupon:user:${code}:${pending.userId}`, 86400 * 30);
        pipe.set(`coupon:redemption:${order_id}`, {
          couponCode: code, orderId: order_id, userId: pending.userId,
          productId: pending.productId,
          originalAmount: pending.originalAmount, discountAmount: pending.discountAmount,
          finalAmount: pending.finalAmount, campaign: pending.coupon.campaign || '',
          status: 'redeemed', redeemedAt: new Date().toISOString(),
        }, { ex: 86400 * 90 });
        pipe.del(`coupon:reservation:${code}:${order_id}`);
        await pipe.exec();
      } catch (e) { console.error('[kakaopay-approve] coupon confirm failed:', e.message); }
    }

    // payment_succeeded 이벤트 기록 (서버 전용)
    try {
      const src = pending.source || 'direct';
      const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      const evKey = pending.coupon
        ? `funnel:ev:${date}:${src}:payment_coupon_succeeded`
        : `funnel:ev:${date}:${src}:payment_succeeded`;
      await redis.pipeline().incr(evKey).expire(evKey, 86400 * 90).exec();
    } catch { /* 기록 실패가 결제에 영향 없도록 */ }

    return res.redirect(`${BASE_URL}/?kp_token=${token}`);
  } catch (e) {
    return res.redirect(`${BASE_URL}/?payment=fail`);
  }
}
