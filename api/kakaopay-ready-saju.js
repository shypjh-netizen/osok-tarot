import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

const CID = 'CT23756943';
const BASE_URL = 'https://osok-tarot.vercel.app';
const PRODUCTS = {
  basic:   { name: '오속 사주 심층리딩',        amount: 9900 },
  premium: { name: '오속 사주 프리미엄 종합풀이', amount: 14900 },
  single:  { name: '오속 사주 질문 집중풀이',    amount: 4900 },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, tier = 'basic' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const prod = PRODUCTS[tier] || PRODUCTS.basic;
  const orderId = `SAJU_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const accessToken = crypto.randomBytes(20).toString('hex');

  try {
    const kakaoRes = await fetch('https://open-api.kakaopay.com/online/v1/payment/ready', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SECRET_KEY ${process.env.KAKAOPAY_SECRET_KEY}`,
      },
      body: JSON.stringify({
        cid: CID,
        partner_order_id: orderId,
        partner_user_id: 'osok_saju',
        item_name: prod.name,
        quantity: 1,
        total_amount: prod.amount,
        vat_amount: 0,
        tax_free_amount: 0,
        approval_url: `${BASE_URL}/api/kakaopay-approve-saju?order_id=${orderId}&token=${accessToken}`,
        fail_url: `${BASE_URL}/saju.html?payment=fail`,
        cancel_url: `${BASE_URL}/saju.html?payment=cancel`,
      }),
    });

    if (!kakaoRes.ok) {
      const err = await kakaoRes.json();
      return res.status(500).json({ error: err });
    }

    const kakaoData = await kakaoRes.json();

    // 결제 대기 정보 저장 (1시간)
    await redis.set(`kp_saju:${orderId}`, {
      tid: kakaoData.tid,
      accessToken,
      email: email.toLowerCase().trim(),
      tier,
    }, { ex: 3600 });

    return res.status(200).json({
      pc_url: kakaoData.next_redirect_pc_url,
      mobile_url: kakaoData.next_redirect_mobile_url,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
