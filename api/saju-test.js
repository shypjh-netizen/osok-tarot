/**
 * /api/saju-test — 개발자 전용 테스트 엔드포인트
 * SAJU_TEST_SECRET 환경변수가 설정된 경우에만 동작
 * 실제 이메일 발송·Redis 기록 없이 HTML 결과물만 반환
 */
import { generateFocusReading, buildEmailHtml, buildSystemPrompt } from './saju-email.js';

export default async function handler(req, res) {
  /* 개발 환경에서만 활성화 */
  const testSecret = process.env.SAJU_TEST_SECRET;
  if (!testSecret) {
    return res.status(404).json({ error: 'not found' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { secret, sajuData: rawData } = req.body || {};

  if (secret !== testSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!rawData) {
    return res.status(400).json({ error: 'sajuData required' });
  }

  const testId = `test_${Date.now()}`;
  console.log(`[saju-test] run start testId=${testId}`);

  try {
    /* sajuData 기본값 채우기 */
    const sajuData = {
      name: '테스트',
      birthYear: 1990,
      birthMonth: 3,
      birthDay: 15,
      birthHour: null,
      gender: 'female',
      calendarType: 'solar',
      relationStatus: 'single',
      concern: { category: 'year', label: '올해의 흐름', question: '' },
      tier: 'single',
      ...rawData,
    };

    const name = sajuData.name || '테스트';
    const currentYear = new Date().getFullYear();
    const currentSewoon = `${currentYear}년 세운`;

    /* 사주 텍스트 컨텍스트 구성 (실제 사주 계산 없이 입력값 그대로) */
    const ctx = sajuData.sajuContext || `이름: ${name}, 생년월일: ${sajuData.birthYear}년 ${sajuData.birthMonth}월 ${sajuData.birthDay}일, 성별: ${sajuData.gender === 'female' ? '여성' : '남성'}`;

    const systemPrompt = buildSystemPrompt(currentYear, currentSewoon);

    const { sections, closingMessage, summaryCard } = await generateFocusReading(
      sajuData, ctx, name, currentYear, currentSewoon, systemPrompt
    );

    const concern = sajuData.concern || {};
    const topicLabel = concern.label || concern.category || '올해의 흐름';
    const infoLine = `${sajuData.birthYear}년생 · ${sajuData.gender === 'female' ? '여성' : '남성'} · ${sajuData.relationStatus}`;
    const basisLine = `[테스트 모드] ${testId}`;

    const html = buildEmailHtml(
      name,
      { infoLine, topicLine: `선택한 고민 · ${topicLabel}`, basisLine },
      sections,
      closingMessage || '',
      '내 질문 하나 집중 리딩 (테스트)',
      summaryCard || null
    );

    console.log(`[saju-test] run complete testId=${testId} sections=${sections.length}`);

    return res.status(200).json({
      ok: true,
      testId,
      html,
      sections: sections.map(s => ({ label: s.label, length: (s.content || '').length })),
      summaryCard,
      closingMessage,
    });
  } catch (e) {
    console.error(`[saju-test] error testId=${testId}:`, e.message);
    return res.status(500).json({ error: e.message, testId });
  }
}
