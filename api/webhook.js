import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // 주문번호 검증 요청 (프론트엔드에서 호출)
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ valid: false });

    const data = await redis.get(`order:${code}`);
    if (!data) return res.status(200).json({ valid: false });

    await redis.del(`order:${code}`); // 1회 사용 후 삭제
    return res.status(200).json({ valid: true, product: data.product });
  }

  // 그로블 웹훅 수신 (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // 결제 완료 이벤트만 처리
      if (body.event !== 'payment.completed' && body.event !== 'order.completed') {
        return res.status(200).json({ ok: true });
      }

      // 주문번호를 키로 저장 (24시간 유효)
      const orderCode = body.order?.order_code || body.order_code || body.order?.id || '';
      const productName = body.order?.product_name || body.product_name || '';

      if (orderCode) {
        await redis.set(`order:${orderCode}`, { product: productName }, { ex: 86400 });
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
