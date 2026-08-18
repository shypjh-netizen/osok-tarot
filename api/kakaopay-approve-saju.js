import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const CID = 'CT23756943';
const BASE_URL = 'https://www.osok.kr';
const ADMIN_EMAIL = 'shypjh@gmail.com';

async function notifyAdmin(subject, body) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: [ADMIN_EMAIL],
        subject,
        html: `<pre style="font-family:sans-serif;font-size:14px;line-height:1.8">${body}</pre>`,
      }),
    });
  } catch (e) {
    console.error('[kakaopay-approve-saju][notifyAdmin] failed:', e.message);
  }
}

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

    const approveData = await approveRes.json();

    /* 쿠폰이 있었다면 승인금액 검증 */
    if (pending.coupon && pending.finalAmount !== undefined) {
      const approved = approveData.amount?.total;
      if (approved !== undefined && approved !== pending.finalAmount) {
        console.error(`[kakaopay-approve-saju] 금액 불일치 expected=${pending.finalAmount} approved=${approved}`);
        return res.redirect(`${BASE_URL}/saju.html?payment=fail`);
      }
    }

    const { email, tier } = pending;

    // Redis에서 사주 데이터 확인
    const sajuData = await redis.get(`saju_pending:${email}`);

    // 주문 기록 저장 (관리자 조회용, 7일 보관)
    const orderRecord = {
      orderId: order_id,
      email,
      tier,
      name: sajuData?.name || '이름 없음',
      paidAt: new Date().toISOString(),
      emailStatus: 'pending',
    };
    await redis.set(`order:saju:${order_id}`, orderRecord, { ex: 604800 });
    // 이메일별 최신 주문 ID 저장 (관리자 조회용)
    await redis.set(`order:saju:by_email:${email.toLowerCase().trim()}`, order_id, { ex: 604800 });

    // 관리자 알림 (결제 확인)
    const tierLabel = tier === 'premium' ? '프리미엄 종합 풀이 (14,900원)' : tier === 'single' ? '내 질문 하나 집중 리딩 (4,900원)' : `기본 (${tier})`;
    await notifyAdmin(
      `[오속 사주] 새 결제 — ${sajuData?.name || email}`,
      `결제 완료됐어요!\n\n고객 이메일: ${email}\n상품: ${tierLabel}\n이름: ${sajuData?.name || '미확인'}\n주문ID: ${order_id}\n시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n\n이메일 발송 중... (3~5분 소요)\n발송 완료/실패 시 추가 알림이 와요.`
    );

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
      } catch (e) { console.error('[kakaopay-approve-saju] coupon confirm failed:', e.message); }
    }

    await redis.del(`kp_saju:${order_id}`);

    if (!sajuData) {
      return res.redirect(`${BASE_URL}/saju.html?payment=success&email=${encodeURIComponent(email)}&no_data=1`);
    }

    return res.redirect(`${BASE_URL}/saju.html?payment=success&email=${encodeURIComponent(email)}&oid=${order_id}`);
  } catch (e) {
    console.error('[kakaopay-approve-saju] error:', e.message);
    return res.redirect(`${BASE_URL}/saju.html?payment=fail`);
  }
}
