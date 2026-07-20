import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const CATEGORY_PROMPTS = [
  { key: 'love',    icon: '💕', label: '사랑 & 인연',   prompt: '사랑과 인연을 깊이 분석해주세요. 이 사람의 연애 패턴, 이상형과의 궁합, 현재 인연의 흐름, 앞으로 좋은 인연이 찾아올 시기와 그 에너지를 구체적으로 담아주세요.' },
  { key: 'career',  icon: '💼', label: '직업 & 적성',   prompt: '직업과 적성을 깊이 분석해주세요. 가장 빛날 수 있는 분야, 직업적 강점과 약점, 지금 커리어 흐름, 앞으로의 성장 방향을 구체적으로 담아주세요.' },
  { key: 'money',   icon: '💰', label: '금전 & 재물',   prompt: '금전과 재물을 깊이 분석해주세요. 재물운의 흐름, 돈을 모으는 방식과 쓰는 패턴, 앞으로 재물이 들어올 시기와 주의해야 할 시기를 구체적으로 담아주세요.' },
  { key: 'health',  icon: '🌿', label: '건강 & 활력',   prompt: '건강과 활력을 깊이 분석해주세요. 사주에서 보이는 체질적 특성, 주의해야 할 신체 부위, 에너지가 떨어지는 시기, 건강을 지키는 생활 습관을 구체적으로 담아주세요.' },
  { key: 'flow',    icon: '🌊', label: '운의 흐름',     prompt: '앞으로의 운의 큰 흐름을 분석해주세요. 지금 어떤 대운·세운 속에 있는지, 앞으로 1~3년간의 기회와 조심해야 할 시기, 이 흐름을 잘 타기 위한 방향을 구체적으로 담아주세요.' },
  { key: 'monthly', icon: '📅', label: '월별 운세',     prompt: '올해 남은 달부터 내년까지 월별 운세를 분석해주세요. 각 달의 에너지, 좋은 달과 조심해야 할 달, 각 달에 집중하면 좋을 영역을 월별로 구체적으로 담아주세요.' },
];

const SAJU_EMAIL_SYSTEM = `당신은 사주명리학, 자미두수, 서양 점성술을 아우르는 동서양 명리 전문 상담사예요.
결제 고객에게 이메일로 전달될 사주 상세 리딩을 작성해주세요.

핵심 철학:
- 운명을 예언하는 게 아니라, 타고난 에너지로 지금 어떻게 살아야 하는지 방향을 제시해요
- "좋다/나쁘다"보다 "지금 이 시기에 당신이 해야 할 것"을 중심으로 이야기해요
- 과거 기질 분석 + 현재 흐름 + 앞으로의 행동 방향을 하나의 스토리로 연결해요

규칙:
- 반드시 해요체 사용
- 내담자의 이름·생년월일·사주팔자를 처음부터 직접 언급하며 완전히 개인화된 리딩
- 사주팔자(일간의 오행 성질, 오행 분포)를 핵심 축으로 해석
- 각 카테고리별로 4~6단락, 충분히 깊이 있게 작성
- 단순 운세 나열이 아니라 구체적인 행동 조언과 방향을 반드시 포함할 것
- 마크다운 기호(**굵게**, *기울임*, # 제목) 사용 금지
- 번호 목록이나 불릿 기호 사용 금지
- 순수한 텍스트만 사용할 것`;

async function generateCategoryReading(sajuContext, categoryPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SAJU_EMAIL_SYSTEM,
      messages: [
        { role: 'user', content: sajuContext },
        { role: 'assistant', content: '네, 사주팔자를 바탕으로 상세 리딩을 시작할게요.' },
        { role: 'user', content: categoryPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.content[0].text;
}

function buildEmailHtml(name, sajuInfoLine, sections) {
  const sectionsHtml = sections.map(({ icon, label, content }) => `
    <div style="margin-bottom:36px">
      <h2 style="color:#c9a84c;font-size:17px;font-weight:700;border-bottom:1px solid rgba(201,168,76,0.25);padding-bottom:10px;margin:0 0 14px">${icon} ${label}</h2>
      <div style="color:#ede0c8;font-size:15px;line-height:2;white-space:pre-wrap">${content}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}님의 오속 사주 상세 리딩</title>
</head>
<body style="background:#06060f;margin:0;padding:0;font-family:Georgia,'Noto Serif KR',serif">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px">

    <!-- 헤더 -->
    <div style="text-align:center;margin-bottom:40px">
      <p style="color:#c9a84c;font-size:11px;letter-spacing:4px;margin:0 0 16px">✦ 오속 사주 ✦</p>
      <h1 style="color:#ede0c8;font-size:22px;line-height:1.6;margin:0 0 10px;font-weight:700">${name}님의 사주 상세 리딩이<br>도착했어요</h1>
      <p style="color:#b89e7e;font-size:13px;margin:0">${sajuInfoLine}</p>
    </div>

    <!-- 본문 -->
    <div style="background:#10102a;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:32px 28px">
      ${sectionsHtml}
    </div>

    <!-- 푸터 -->
    <div style="text-align:center;color:rgba(184,158,126,0.5);font-size:12px;line-height:2;margin-top:32px;padding-top:24px;border-top:1px solid rgba(201,168,76,0.08)">
      <p style="margin:0">오속 사주 · osok-tarot.vercel.app/saju.html</p>
      <p style="margin:0">궁금한 점은 <a href="http://pf.kakao.com/_bSudX/chat" style="color:#c9a84c">카카오 채널</a>로 문의해주세요</p>
    </div>

  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, sajuData } = req.body;
  if (!email || !sajuData) return res.status(400).json({ error: 'missing fields' });

  try {
    const name = sajuData.name || '내담자';
    const sajuInfoLine = `${sajuData.year}년 ${sajuData.month}월 ${sajuData.day}일생 · ${sajuData.gender === 'm' ? '남성' : '여성'}`;

    // 6개 카테고리 순차 생성
    const sections = [];
    for (const cat of CATEGORY_PROMPTS) {
      const content = await generateCategoryReading(sajuData.context, cat.prompt);
      sections.push({ icon: cat.icon, label: cat.label, content });
    }

    const html = buildEmailHtml(name, sajuInfoLine, sections);

    // Resend로 이메일 발송
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: [email],
        subject: `${name}님의 오속 사주 상세 리딩이 도착했어요 ✦`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      throw new Error(JSON.stringify(err));
    }

    // Redis 정리
    await redis.del(`saju_pending:${email.toLowerCase().trim()}`);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
