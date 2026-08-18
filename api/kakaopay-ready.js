import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

const CID = 'CT23756943';
const BASE_URL = 'https://www.osok.kr';
const PRODUCTS = {
  basic: { name: '오속타로 심층리딩',        amount: 5900 },
  extra: { name: '오속타로 추가질문',         amount: 3900 },
  set:   { name: '오속타로 심층리딩 세트',    amount: 8900 },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { product = 'basic' } = req.body;
  const prod = PRODUCTS[product] || PRODUCTS.basic;

  const orderId = `OSOK_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
        partner_user_id: 'osok_tarot',
        item_name: prod.name,
        quantity: 1,
        total_amount: prod.amount,
        vat_amount: 0,
        tax_free_amount: 0,
        approval_url: `${BASE_URL}/api/kakaopay-approve?order_id=${orderId}&token=${accessToken}`,
        fail_url: `${BASE_URL}/?payment=fail`,
        cancel_url: `${BASE_URL}/?payment=cancel`,
      }),
    });

    if (!kakaoRes.ok) {
      const err = await kakaoRes.json();
      return res.status(500).json({ error: err });
    }

    const kakaoData = await kakaoRes.json();

    // 결제 대기 정보 저장 (1시간 유효)
    await redis.set(`kp:${orderId}`, {
      tid: kakaoData.tid,
      accessToken,
      product: prod.name,
      source: req.body._source || 'direct',
    }, { ex: 3600 });

    return res.status(200).json({
      pc_url: kakaoData.next_redirect_pc_url,
      mobile_url: kakaoData.next_redirect_mobile_url,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
