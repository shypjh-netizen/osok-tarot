import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

const CID = 'CT23756943';
const BASE_URL = 'https://www.osok.kr';
const PRODUCTS = {
  basic: { name: '오속타로 심층리딩',        amount: 5900, couponId: 'tarot_basic' },
  extra: { name: '오속타로 추가질문',         amount: 3900, couponId: 'tarot_extra' },
  set:   { name: '오속타로 심층리딩 세트',    amount: 8900, couponId: 'tarot_set'   },
};

/* 쿠폰 할인 계산 (서버 기준) */
function calcDiscount(coupon, originalAmount) {
  let d = 0;
  if (coupon.discountType === 'percent') {
    d = Math.floor(originalAmount * coupon.discountValue / 100);
    if (coupon.maxDiscountAmount) d = Math.min(d, coupon.maxDiscountAmount);
  } else if (coupon.discountType === 'fixed') {
    d = coupon.discountValue;
  } else if (coupon.discountType === 'free') {
    d = originalAmount;
  }
  return Math.min(d, originalAmount);
}
function checkCouponDef(coupon, productId) {
  if (!coupon) return 'not_found';
  if (!coupon.active) return 'inactive';
  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return 'not_started';
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return 'expired';
  const prods = coupon.applicableProductIds || [];
  if (prods.length > 0 && !prods.includes('all') && !prods.includes(productId)) return 'wrong_product';
  return null;
}
const LUA_RESERVE = `
local maxRed=tonumber(ARGV[1])
local perUser=tonumber(ARGV[2])
local ttl=tonumber(ARGV[3])
if maxRed>=0 then
  local c=tonumber(redis.call('GET',KEYS[1]) or '0')
  if c>=maxRed then return 1 end
end
if perUser>=0 then
  local u=tonumber(redis.call('GET',KEYS[2]) or '0')
  if u>=perUser then return 2 end
end
redis.call('INCR',KEYS[1])
redis.call('SET',KEYS[3],'1','EX',ttl)
return 0
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { product = 'basic', couponCode, userId } = req.body;
  const prod = PRODUCTS[product] || PRODUCTS.basic;

  const orderId = `OSOK_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const accessToken = crypto.randomBytes(20).toString('hex');

  /* 쿠폰 처리 */
  let finalAmount = prod.amount;
  let discountAmount = 0;
  let appliedCoupon = null;
  let normalizedCode = null;

  if (couponCode && userId) {
    normalizedCode = couponCode.toUpperCase().trim();
    const coupon = await redis.get(`coupon:${normalizedCode}`);
    const defErr = checkCouponDef(coupon, prod.couponId);
    if (defErr) return res.status(400).json({ error: `coupon_${defErr}` });

    const result = await redis.eval(
      LUA_RESERVE,
      [`coupon:count:${normalizedCode}`, `coupon:user:${normalizedCode}:${userId}`, `coupon:reservation:${normalizedCode}:${orderId}`],
      [String(coupon.maxRedemptions ?? -1), String(coupon.perUserLimit ?? 1), '900']
    );
    if (result === 1) return res.status(400).json({ error: 'coupon_max_used' });
    if (result === 2) return res.status(400).json({ error: 'coupon_user_limit' });

    discountAmount = calcDiscount(coupon, prod.amount);
    finalAmount = prod.amount - discountAmount;
    appliedCoupon = { code: normalizedCode, campaign: coupon.campaign || '' };
  }

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
        total_amount: finalAmount,
        vat_amount: 0,
        tax_free_amount: 0,
        approval_url: `${BASE_URL}/api/kakaopay-approve?order_id=${orderId}&token=${accessToken}`,
        fail_url: `${BASE_URL}/?payment=fail`,
        cancel_url: `${BASE_URL}/?payment=cancel`,
      }),
    });

    if (!kakaoRes.ok) {
      if (appliedCoupon) {
        const LUA_RELEASE = `local ex=redis.call('GET',KEYS[2]);if not ex then return 0 end;redis.call('DECR',KEYS[1]);redis.call('DEL',KEYS[2]);return 1`;
        await redis.eval(LUA_RELEASE, [`coupon:count:${normalizedCode}`, `coupon:reservation:${normalizedCode}:${orderId}`], []);
      }
      const err = await kakaoRes.json();
      return res.status(500).json({ error: err });
    }

    const kakaoData = await kakaoRes.json();

    await redis.set(`kp:${orderId}`, {
      tid: kakaoData.tid, accessToken,
      product: prod.name, productId: prod.couponId,
      originalAmount: prod.amount, finalAmount, discountAmount,
      coupon: appliedCoupon, userId: userId || null,
      source: req.body._source || 'direct',
    }, { ex: 3600 });

    return res.status(200).json({
      pc_url: kakaoData.next_redirect_pc_url,
      mobile_url: kakaoData.next_redirect_mobile_url,
    });
  } catch (e) {
    if (appliedCoupon) {
      const LUA_RELEASE = `local ex=redis.call('GET',KEYS[2]);if not ex then return 0 end;redis.call('DECR',KEYS[1]);redis.call('DEL',KEYS[2]);return 1`;
      await redis.eval(LUA_RELEASE, [`coupon:count:${normalizedCode}`, `coupon:reservation:${normalizedCode}:${orderId}`], []).catch(() => {});
    }
    return res.status(500).json({ error: e.message });
  }
}
