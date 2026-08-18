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

  /* ── 4. 사주 이메일 재발송 (관리자 전용) ── */
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
