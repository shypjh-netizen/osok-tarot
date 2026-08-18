import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/* ── 허용된 프론트엔드 이벤트 (payment_succeeded는 서버 전용) ── */
const FRONTEND_EVENTS = new Set([
  'landing_view', 'free_reading_started', 'card_selected',
  'free_reading_request_sent', 'free_reading_succeeded', 'free_reading_failed',
  'paid_offer_viewed', 'paid_product_selected', 'checkout_viewed',
  'payment_attempted', 'payment_failed',
  'paid_reading_succeeded', 'paid_reading_failed',
]);

function kstDate(offsetDays = 0) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

function normSource(s) {
  const v = (s || '').toLowerCase().trim();
  if (v === 'karrot' || v === 'daangn') return 'karrot';
  if (v === 'threads') return 'threads';
  if (!v || v === 'direct') return 'direct';
  return 'other';
}

/* ── 이벤트 기록 (내부 공유 함수) ── */
async function logEvent({ event, sessionId, source }) {
  const date = kstDate();
  const src = normSource(source);
  const pipe = redis.pipeline();
  const evKey = `funnel:ev:${date}:${src}:${event}`;
  pipe.incr(evKey);
  pipe.expire(evKey, 86400 * 90);
  if (sessionId && /^[a-z0-9_\-]{8,64}$/i.test(sessionId)) {
    const sessKey = `funnel:sess:${sessionId}`;
    pipe.hsetnx(sessKey, event, '1');
    pipe.expire(sessKey, 86400);
  }
  await pipe.exec();
}

export { logEvent };

/* ─────────────────────────────────────────────────────────────
   쿠폰 시스템 헬퍼
───────────────────────────────────────────────────────────── */
const COUPON_RESERVATION_TTL = 900; // 15분

const ALL_PRODUCTS = {
  tarot_basic:  { name: '오속타로 심층리딩',           amount: 5900, type: 'tarot' },
  tarot_extra:  { name: '오속타로 추가질문',            amount: 3900, type: 'tarot' },
  tarot_set:    { name: '오속타로 심층리딩 세트',       amount: 8900, type: 'tarot' },
  saju_single:  { name: '오속 사주 질문 집중풀이',      amount: 4900, type: 'saju'  },
  saju_premium: { name: '오속 사주 프리미엄 종합풀이',  amount: 14900, type: 'saju' },
};

function calcDiscount(coupon, originalAmount) {
  let discount = 0;
  if (coupon.discountType === 'percent') {
    discount = Math.floor(originalAmount * coupon.discountValue / 100);
    if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
  } else if (coupon.discountType === 'fixed') {
    discount = coupon.discountValue;
  } else if (coupon.discountType === 'free') {
    discount = originalAmount;
  }
  return Math.min(discount, originalAmount);
}

function checkCouponDef(coupon, productId) {
  if (!coupon) return 'not_found';
  if (!coupon.active) return 'inactive';
  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return 'not_started';
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return 'expired';
  const products = coupon.applicableProductIds || [];
  if (products.length > 0 && !products.includes('all') && !products.includes(productId)) {
    return 'wrong_product';
  }
  return null;
}

/* 원자적 예약 Lua 스크립트
   KEYS[1]=count, KEYS[2]=user_count, KEYS[3]=reservation
   ARGV[1]=maxRed(-1=무제한), ARGV[2]=perUser(-1=무제한), ARGV[3]=ttl
   반환: 0=성공, 1=전체횟수초과, 2=사용자횟수초과 */
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

/* 원자적 예약 해제 Lua 스크립트
   KEYS[1]=count, KEYS[2]=reservation
   반환: 1=해제됨, 0=예약없음 */
const LUA_RELEASE = `
local ex=redis.call('GET',KEYS[2])
if not ex then return 0 end
redis.call('DECR',KEYS[1])
if tonumber(redis.call('GET',KEYS[1]))<0 then redis.call('SET',KEYS[1],'0') end
redis.call('DEL',KEYS[2])
return 1
`;

async function couponReserve(redis, code, productId, userId, orderId) {
  const coupon = await redis.get(`coupon:${code}`);
  const defErr = checkCouponDef(coupon, productId);
  if (defErr) return { error: defErr };

  /* 현재 전체 사용 횟수 확인 (Lua 에서도 체크하지만 빠른 반환용) */
  const maxRed = coupon.maxRedemptions ?? -1;
  const perUser = coupon.perUserLimit ?? 1;

  const result = await redis.eval(
    LUA_RESERVE,
    [`coupon:count:${code}`, `coupon:user:${code}:${userId}`, `coupon:reservation:${code}:${orderId}`],
    [String(maxRed), String(perUser), String(COUPON_RESERVATION_TTL)]
  );

  if (result === 1) return { error: 'max_used' };
  if (result === 2) return { error: 'user_limit' };
  return { ok: true, coupon };
}

async function couponConfirm(redis, code, orderId, userId, productId, originalAmount, discountAmount, finalAmount, campaign) {
  const pipe = redis.pipeline();
  pipe.incr(`coupon:user:${code}:${userId}`);
  pipe.expire(`coupon:user:${code}:${userId}`, 86400 * 30);
  pipe.set(`coupon:redemption:${orderId}`, {
    couponCode: code, orderId, userId, productId,
    originalAmount, discountAmount, finalAmount, campaign: campaign || '',
    status: 'redeemed', redeemedAt: new Date().toISOString(),
  }, { ex: 86400 * 90 });
  pipe.del(`coupon:reservation:${code}:${orderId}`);
  await pipe.exec();
}

async function couponRelease(redis, code, orderId) {
  await redis.eval(
    LUA_RELEASE,
    [`coupon:count:${code}`, `coupon:reservation:${code}:${orderId}`],
    []
  );
}

function generateCouponCode(prefix = 'OSOK') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${part}`;
}

export default async function handler(req, res) {
  const { action, code } = req.query;

  /* ── 1. 주문 코드 검증 (기존 기능 유지) ── */
  if (req.method === 'GET' && code && !action) {
    try {
      const order = await redis.get(`order:${code}`);
      if (!order) return res.status(200).json({ valid: false });
      return res.status(200).json({ valid: true, product: order.product || '' });
    } catch {
      return res.status(500).json({ valid: false });
    }
  }

  /* ── 2. 사주 데이터 저장 (구 saju-save.js 통합) ── */
  if (req.method === 'POST' && action === 'saju-save') {
    const { email, sajuData, tier } = req.body || {};
    if (!email || !sajuData) return res.status(400).json({ error: 'missing fields' });
    const key = `saju_pending:${email.toLowerCase().trim()}`;
    await redis.set(key, { ...sajuData, tier: tier || 'basic' }, { ex: 86400 });
    return res.status(200).json({ ok: true });
  }

  /* ── 3. 퍼널 이벤트 추적 ── */
  if (req.method === 'POST' && action === 'track') {
    const { event, sessionId, source, productType } = req.body || {};

    if (!FRONTEND_EVENTS.has(event)) return res.status(400).json({ error: 'invalid event' });
    if (!sessionId || typeof sessionId !== 'string' || !/^[a-z0-9_\-]{8,64}$/i.test(sessionId)) {
      return res.status(400).json({ error: 'invalid session' });
    }

    // IP rate limit: 5분 200회
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
    const rlKey = `funnel:rl:${ip}:${Math.floor(Date.now() / 300000)}`;
    try {
      const cnt = await redis.incr(rlKey);
      if (cnt === 1) await redis.expire(rlKey, 300);
      if (cnt > 200) return res.status(429).json({ error: 'rate limit' });
    } catch { /* rate limit 실패해도 이벤트 기록 계속 */ }

    try { await logEvent({ event, sessionId, source, productType }); } catch { /* 무시 */ }
    return res.status(200).json({ ok: true });
  }

  /* ── 3b. 쿠폰 기본 정보 조회 (상품 무관, 첫 화면용) ── */
  if (req.method === 'POST' && action === 'coupon-info') {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'missing_fields' });
    const normalized = code.toUpperCase().trim();
    const coupon = await redis.get(`coupon:${normalized}`);
    if (!coupon) return res.status(200).json({ valid: false, error: 'not_found' });
    if (!coupon.active) return res.status(200).json({ valid: false, error: 'inactive' });
    const now = Date.now();
    if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return res.status(200).json({ valid: false, error: 'not_started' });
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return res.status(200).json({ valid: false, error: 'expired' });
    const maxRed = coupon.maxRedemptions ?? -1;
    if (maxRed >= 0) {
      const cnt = parseInt(await redis.get(`coupon:count:${normalized}`) || '0', 10);
      if (cnt >= maxRed) return res.status(200).json({ valid: false, error: 'max_used' });
    }
    return res.status(200).json({
      valid: true, code: normalized,
      discountType: coupon.discountType, discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      applicableProductIds: coupon.applicableProductIds || ['all'],
      campaign: coupon.campaign || '',
    });
  }

  /* ── 4. 쿠폰 검증 (고객용 미리보기 — 예약 없음) ── */
  if (req.method === 'POST' && action === 'coupon-validate') {
    const { code, productId, userId } = req.body || {};
    if (!code || !productId || !userId) return res.status(400).json({ error: 'missing_fields' });
    if (!ALL_PRODUCTS[productId]) return res.status(400).json({ error: 'invalid_product' });

    const normalized = code.toUpperCase().trim();
    const coupon = await redis.get(`coupon:${normalized}`);
    const defErr = checkCouponDef(coupon, productId);
    if (defErr) return res.status(200).json({ valid: false, reason: defErr });

    /* 현재 사용 횟수 확인 */
    const maxRed = coupon.maxRedemptions ?? -1;
    if (maxRed >= 0) {
      const cnt = parseInt(await redis.get(`coupon:count:${normalized}`) || '0', 10);
      if (cnt >= maxRed) return res.status(200).json({ valid: false, reason: 'max_used' });
    }

    const originalAmount = ALL_PRODUCTS[productId].amount;
    const discountAmount = calcDiscount(coupon, originalAmount);
    const finalAmount = originalAmount - discountAmount;

    return res.status(200).json({
      valid: true, code: normalized,
      discountType: coupon.discountType, discountValue: coupon.discountValue,
      originalAmount, discountAmount, finalAmount,
      isFree: finalAmount === 0,
    });
  }

  /* ── 5. 쿠폰 무료 주문 완료 — 타로 (결제창 없이 권한 부여) ── */
  if (req.method === 'POST' && action === 'coupon-free-order') {
    const { code, productId, userId, orderId } = req.body || {};
    if (!code || !productId || !userId || !orderId) return res.status(400).json({ error: 'missing_fields' });
    const prod = ALL_PRODUCTS[productId];
    if (!prod || prod.type !== 'tarot') return res.status(400).json({ error: 'invalid_product' });

    /* 이미 처리된 주문인지 확인 (idempotency) */
    const existing = await redis.get(`coupon:redemption:${orderId}`);
    if (existing) return res.status(200).json({ ok: true, token: existing.token || orderId, idempotent: true });

    const normalized = code.toUpperCase().trim();
    const { error: resErr, coupon } = await couponReserve(redis, normalized, productId, userId, orderId);
    if (resErr) return res.status(200).json({ valid: false, reason: resErr });

    const originalAmount = prod.amount;
    const discountAmount = calcDiscount(coupon, originalAmount);
    const finalAmount = originalAmount - discountAmount;
    if (finalAmount !== 0) {
      await couponRelease(redis, normalized, orderId);
      return res.status(400).json({ error: 'not_free' });
    }

    /* 권한 부여 (token = orderId 자체 사용) */
    const token = orderId;
    await redis.set(`order:${token}`, { product: prod.name }, { ex: 604800 });
    await couponConfirm(redis, normalized, orderId, userId, productId, originalAmount, discountAmount, 0, coupon.campaign || '');

    /* 무료쿠폰 이벤트 기록 */
    try {
      const date = kstDate();
      const pipe = redis.pipeline();
      pipe.incr(`coupon:ev:${date}:free_order`);
      pipe.expire(`coupon:ev:${date}:free_order`, 86400 * 90);
      await pipe.exec();
    } catch {}

    return res.status(200).json({ ok: true, token, productName: prod.name });
  }

  /* ── 6. 쿠폰 무료 주문 완료 — 사주 (이메일 발송 트리거) ── */
  if (req.method === 'POST' && action === 'coupon-free-saju-order') {
    const { code, productId, userId, email } = req.body || {};
    if (!code || !productId || !userId || !email) return res.status(400).json({ error: 'missing_fields' });
    const prod = ALL_PRODUCTS[productId];
    if (!prod || prod.type !== 'saju') return res.status(400).json({ error: 'invalid_product' });

    const normalized = code.toUpperCase().trim();
    const emailKey = email.toLowerCase().trim();
    const orderId = `COUPON_${Date.now()}_${emailKey.replace(/[^a-z0-9]/g, '').slice(0, 8)}`;

    /* idempotency — 같은 이메일의 중복 무료 주문 차단 (1시간) */
    const lockKey = `coupon:saju:lock:${normalized}:${emailKey}`;
    const locked = await redis.set(lockKey, orderId, { ex: 3600, nx: true });
    if (!locked) return res.status(200).json({ ok: true, idempotent: true });

    const { error: resErr, coupon } = await couponReserve(redis, normalized, productId, userId, orderId);
    if (resErr) {
      await redis.del(lockKey);
      return res.status(200).json({ valid: false, reason: resErr });
    }

    const originalAmount = prod.amount;
    const discountAmount = calcDiscount(coupon, originalAmount);
    const finalAmount = originalAmount - discountAmount;
    if (finalAmount !== 0) {
      await couponRelease(redis, normalized, orderId);
      await redis.del(lockKey);
      return res.status(400).json({ error: 'not_free' });
    }

    /* saju_pending 확인 */
    const sajuData = await redis.get(`saju_pending:${emailKey}`);
    if (!sajuData) {
      await couponRelease(redis, normalized, orderId);
      await redis.del(lockKey);
      return res.status(404).json({ error: 'saju_data_not_found' });
    }

    await couponConfirm(redis, normalized, orderId, userId, productId, originalAmount, discountAmount, 0, coupon.campaign || '');

    /* 주문 기록 */
    const tier = productId === 'saju_premium' ? 'premium' : 'single';
    await redis.set(`order:saju:${orderId}`, {
      orderId, email: emailKey, tier,
      name: sajuData.name || '이름 없음',
      paidAt: new Date().toISOString(), emailStatus: 'pending', couponCode: normalized,
    }, { ex: 604800 });
    await redis.set(`order:saju:by_email:${emailKey}`, orderId, { ex: 604800 });

    /* 이메일 발송 트리거 */
    try {
      const origin = `https://${req.headers.host || 'www.osok.kr'}`;
      await fetch(`${origin}/api/saju-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailKey }),
      });
    } catch {}

    return res.status(200).json({ ok: true, orderId, email: emailKey });
  }

  /* ── 7. 쿠폰 예약 해제 (결제 취소·실패 시 클라이언트 호출) ── */
  if (req.method === 'POST' && action === 'coupon-release') {
    const { code, orderId } = req.body || {};
    if (!code || !orderId) return res.status(400).json({ error: 'missing_fields' });
    await couponRelease(redis, code.toUpperCase().trim(), orderId);
    return res.status(200).json({ ok: true });
  }

  /* ── 8. 사주 이메일 재발송 (관리자 전용) ── */
  if (action === 'resend-saju') {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email required' });

    const sajuData = await redis.get(`saju_pending:${email}`);
    if (!sajuData) return res.status(404).json({ error: 'saju data not found', email });

    const origin = `https://${req.headers.host || 'www.osok.kr'}`;
    const emailRes = await fetch(`${origin}/api/saju-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = emailRes.ok ? await emailRes.json().catch(() => ({})) : {};
    return res.status(emailRes.status).json({ ok: emailRes.ok, email, tier: sajuData.tier, ...result });
  }

  /* ── 관리자 인증 공통 확인 ── */
  const isAdmin = req.headers['x-admin-secret'] === process.env.ADMIN_SECRET;

  /* ── A. 쿠폰 생성 (관리자) ── */
  if (req.method === 'POST' && action === 'coupon-create') {
    if (!isAdmin) return res.status(401).json({ error: 'unauthorized' });
    const {
      code: rawCode, discountType, discountValue, maxDiscountAmount,
      applicableProductIds, startsAt, expiresAt, maxRedemptions,
      perUserLimit, description, campaign,
    } = req.body || {};

    if (!discountType || discountValue === undefined) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }
    if (!['percent', 'fixed', 'free'].includes(discountType)) {
      return res.status(400).json({ error: 'invalid_discount_type' });
    }

    /* 코드 생성 또는 정규화 */
    let finalCode = rawCode ? rawCode.toUpperCase().trim() : generateCouponCode();
    /* 중복 확인 */
    const existing = await redis.get(`coupon:${finalCode}`);
    if (existing) return res.status(409).json({ error: 'code_already_exists', code: finalCode });

    const now = new Date().toISOString();
    const couponData = {
      code: finalCode, discountType,
      discountValue: Number(discountValue),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      applicableProductIds: applicableProductIds || ['all'],
      startsAt: startsAt || null, expiresAt: expiresAt || null,
      maxRedemptions: maxRedemptions !== undefined ? Number(maxRedemptions) : -1,
      perUserLimit: perUserLimit !== undefined ? Number(perUserLimit) : 1,
      active: true, description: description || '', campaign: campaign || '',
      createdAt: now, updatedAt: now,
    };

    await redis.set(`coupon:${finalCode}`, couponData);
    await redis.sadd('coupon:index', finalCode);
    return res.status(200).json({ ok: true, code: finalCode, coupon: couponData });
  }

  /* ── B. 이벤트 쿠폰 일괄 생성 (관리자) ── */
  if (req.method === 'POST' && action === 'coupon-quick-event') {
    if (!isAdmin) return res.status(401).json({ error: 'unauthorized' });
    const { productIds, expiresAt, campaign, count = 3 } = req.body || {};
    if (!expiresAt) return res.status(400).json({ error: 'expiresAt_required' });

    const codes = [];
    const maxTry = count * 5;
    let tries = 0;
    while (codes.length < count && tries < maxTry) {
      tries++;
      const c = generateCouponCode();
      const ex = await redis.get(`coupon:${c}`);
      if (ex) continue;
      const now = new Date().toISOString();
      const couponData = {
        code: c, discountType: 'free', discountValue: 100,
        maxDiscountAmount: null,
        applicableProductIds: productIds || ['tarot_basic'],
        startsAt: null, expiresAt,
        maxRedemptions: 1, perUserLimit: 1,
        active: true, description: '이벤트 쿠폰', campaign: campaign || 'event',
        createdAt: now, updatedAt: now,
      };
      await redis.set(`coupon:${c}`, couponData);
      await redis.sadd('coupon:index', c);
      codes.push(c);
    }
    return res.status(200).json({ ok: true, codes });
  }

  /* ── C. 쿠폰 목록 (관리자) ── */
  if (req.method === 'GET' && action === 'coupon-list') {
    if (!isAdmin) return res.status(401).json({ error: 'unauthorized' });
    const allCodes = await redis.smembers('coupon:index');
    if (!allCodes || allCodes.length === 0) return res.status(200).json({ coupons: [] });

    const pipe = redis.pipeline();
    for (const c of allCodes) pipe.get(`coupon:${c}`);
    const coupons = await pipe.exec();

    const pipe2 = redis.pipeline();
    for (const c of allCodes) pipe2.get(`coupon:count:${c}`);
    const counts = await pipe2.exec();

    const result = allCodes.map((c, i) => ({
      ...(coupons[i] || {}),
      usedCount: parseInt(counts[i] || '0', 10),
    })).filter(Boolean);

    return res.status(200).json({ coupons: result });
  }

  /* ── D. 쿠폰 상세 + 사용 내역 (관리자) ── */
  if (req.method === 'GET' && action === 'coupon-detail') {
    if (!isAdmin) return res.status(401).json({ error: 'unauthorized' });
    const { coupon: code } = req.query;
    if (!code) return res.status(400).json({ error: 'code_required' });
    const normalized = code.toUpperCase().trim();
    const coupon = await redis.get(`coupon:${normalized}`);
    if (!coupon) return res.status(404).json({ error: 'not_found' });
    const usedCount = parseInt(await redis.get(`coupon:count:${normalized}`) || '0', 10);
    return res.status(200).json({ coupon, usedCount });
  }

  /* ── E. 쿠폰 활성화/중지 토글 (관리자) ── */
  if (req.method === 'POST' && action === 'coupon-toggle') {
    if (!isAdmin) return res.status(401).json({ error: 'unauthorized' });
    const { code: rawCode, active } = req.body || {};
    if (!rawCode || active === undefined) return res.status(400).json({ error: 'missing_fields' });
    const normalized = rawCode.toUpperCase().trim();
    const coupon = await redis.get(`coupon:${normalized}`);
    if (!coupon) return res.status(404).json({ error: 'not_found' });
    coupon.active = !!active;
    coupon.updatedAt = new Date().toISOString();
    await redis.set(`coupon:${normalized}`, coupon);
    return res.status(200).json({ ok: true, code: normalized, active: coupon.active });
  }

  /* ── 5. 관리자 통계 ── */
  if (req.method === 'GET' && action === 'admin') {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const days = Math.min(parseInt(req.query.days || '7', 10), 90);
    const filterSrc = req.query.source || 'all';

    const ALL_EVENTS = [
      'landing_view', 'free_reading_started', 'card_selected',
      'free_reading_request_sent', 'free_reading_succeeded', 'free_reading_failed',
      'paid_offer_viewed', 'paid_product_selected', 'checkout_viewed',
      'payment_attempted', 'payment_succeeded', 'payment_failed',
      'paid_reading_succeeded', 'paid_reading_failed',
    ];
    const sources = filterSrc === 'all'
      ? ['karrot', 'threads', 'direct', 'other']
      : [filterSrc];

    const dates = [];
    for (let i = 0; i < days; i++) dates.push(kstDate(-i));

    const pipe = redis.pipeline();
    const keyMeta = [];

    for (const date of dates) {
      for (const src of sources) {
        for (const ev of ALL_EVENTS) {
          pipe.get(`funnel:ev:${date}:${src}:${ev}`);
          keyMeta.push({ date, ev });
        }
      }
    }
    for (const date of dates) {
      for (const type of ['free', 'paid']) {
        for (const stat of ['count', 'input', 'output', 'ok', 'fail']) {
          pipe.get(`funnel:tok:${date}:${type}:${stat}`);
          keyMeta.push({ date, type, stat, isTok: true });
        }
      }
    }

    const results = await pipe.exec();

    const totals = Object.fromEntries(ALL_EVENTS.map(e => [e, 0]));
    const dailyMap = {};
    for (const date of dates) dailyMap[date] = Object.fromEntries(ALL_EVENTS.map(e => [e, 0]));
    const tokens = {
      free: { count: 0, input: 0, output: 0, ok: 0, fail: 0 },
      paid: { count: 0, input: 0, output: 0, ok: 0, fail: 0 },
    };

    results.forEach((val, i) => {
      const n = parseInt(val || '0', 10);
      const m = keyMeta[i];
      if (m.isTok) { tokens[m.type][m.stat] += n; }
      else { totals[m.ev] += n; dailyMap[m.date][m.ev] += n; }
    });

    const daily = dates.map(date => ({ date, events: dailyMap[date] }));
    return res.status(200).json({ totals, daily, tokens, days, filterSrc });
  }

  return res.status(404).json({ error: 'not found' });
}
