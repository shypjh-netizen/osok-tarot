import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/* ────────────────────────────────────────
   AI 카테고리 프롬프트 (기본 + 프리미엄)
   섹션 순서: 질문 → 연애 → 직업 → 재물 →
              건강 → 운흐름 → 시기표 → 행동계획
              → [프리미엄 3개] → 마무리
──────────────────────────────────────── */
/* 관계 상태별 연애/관계 섹션 설정 */
const REL_LOVE_CONFIG = {
  single: {
    label: '새로운 인연과 연애운',
    interp: '이 사람은 현재 미혼·솔로 상태예요. 새로운 인연·만남·관계 시작 에너지를 중심으로 해석해주세요.',
    focus: '새로운 인연이 들어오는 시기, 만남이 생기기 쉬운 환경, 잘 맞는 상대의 성향, 관계를 시작할 때 주의할 점, 반복되는 연애 패턴',
  },
  dating: {
    label: '현재 연애와 관계의 흐름',
    interp: '이 사람은 현재 연애 중이에요. 현재 관계의 발전·갈등·미래 방향 중심으로 해석해주세요. 현재 관계 외 새로운 이성 인연을 예고하지 마세요.',
    focus: '현재 관계의 감정 흐름, 관계가 깊어지거나 변화하는 시기, 소통과 갈등 패턴, 서로 조율해야 할 부분, 장기적 관계를 위해 필요한 행동',
  },
  married: {
    label: '부부관계와 가정의 흐름',
    interp: '이 사람은 기혼이에요. 배우자와의 관계·부부 소통·가정 흐름 중심으로 해석해주세요. "새로운 연애가 시작됩니다", "새로운 이성이 나타납니다", "운명적인 상대를 만납니다" 등 배우자 외 인연 암시 표현은 절대 사용하지 마세요. 인연 기운이 강해도 배우자와의 교류 증가, 부부 공동 목표, 가정 내 역할 변화로 표현하세요.',
    focus: '배우자와의 감정적 교류, 부부 간 소통과 갈등, 가정생활의 변화, 함께 결정해야 할 재정·생활 문제, 서로의 역할과 거리 조절, 관계를 안정적으로 유지하는 방법',
  },
  separated: {
    label: '관계의 회복과 새로운 인연',
    interp: '이 사람은 이별·이혼 후 솔로 상태예요. 감정 회복·관계 패턴 이해·새로운 인연의 가능성 중심으로 해석해주세요. 과거 관계를 판단하거나 단정하지 마세요.',
    focus: '과거 관계에서 회복해야 할 부분, 반복되는 관계 패턴, 감정적으로 새로운 관계를 받아들일 준비, 새로운 인연의 가능성과 시기, 서두르지 않아야 할 부분',
  },
  private: {
    label: '인연과 관계의 흐름',
    interp: '관계 상태를 답변하지 않았어요. 중립적으로 관계와 인연 에너지만 설명해주세요. 새로운 연애나 결혼 여부를 단정하지 마세요.',
    focus: '가까운 사람들과의 관계 흐름, 감정 표현과 소통 방식, 관계에서 반복되는 패턴, 중요한 관계를 유지하는 방법',
  },
};

const CATEGORY_PROMPTS = [
  {
    key: 'love',
    icon: '💕',
    label: '사랑 & 인연 심층 분석', // 실제 label은 핸들러에서 관계 상태에 따라 교체됨
    prompt: null, // 핸들러에서 관계 상태에 따라 동적 생성
  },
  {
    key: 'career',
    icon: '💼',
    label: '직업 & 적성 심층 분석',
    prompt: `직업과 적성 영역을 깊이 분석해주세요.

핵심 결론 — 이 사람이 가장 빛나는 일의 방향 한 단락
사주 근거 — 어떤 오행·십성에서 직업 기질이 나오는지
강점 — 직업적으로 뛰어난 역량
주의 — 커리어에서 반복되는 약점이나 주의점
지금 이 시기 — 올해 커리어 흐름과 적기
행동 방향 — 지금 커리어에서 실천할 수 있는 구체적 방향 1~2가지

4~6단락으로 충분히 깊이 있게. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'money',
    icon: '💰',
    label: '금전 & 재물 심층 분석',
    prompt: `금전과 재물 영역을 깊이 분석해주세요.

핵심 결론 — 이 사람의 재물 기질과 돈과의 관계 한 단락
사주 근거 — 재물운을 보여주는 오행·십성 구조
강점 — 재물이 들어오는 방식과 패턴
주의 — 돈이 새는 원인이나 주의할 지출 패턴
지금 이 시기 — 올해 재물 흐름과 집중해야 할 시기
행동 방향 — 지금 재물에서 실천할 수 있는 구체적 방향 1~2가지

4~6단락으로 충분히 깊이 있게. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'health',
    icon: '🌿',
    label: '건강 & 활력 분석',
    prompt: `건강과 활력 영역을 분석해주세요.

사주에서 보이는 체질적 특성, 주의해야 할 신체 부위, 에너지가 떨어지는 시기, 건강을 지키는 생활 습관을 구체적으로 담아주세요.

3~4단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'flow',
    icon: '🌊',
    label: '운의 큰 흐름 (1~3년)',
    prompt: `앞으로 1~3년간 운의 큰 흐름을 분석해주세요.

지금 어떤 대운·세운 속에 있는지, 언제 기회가 오고 언제 조심해야 하는지, 이 흐름을 잘 타기 위한 방향을 구체적으로 담아주세요.

4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
];

const PREMIUM_PROMPTS = [
  {
    key: 'direction',
    icon: '🧭',
    label: '인생 방향 조언',
    prompt: `이 사람의 사주팔자와 오행 에너지를 바탕으로 인생 방향 조언을 깊이 있게 작성해주세요.

타고난 기질로 가장 잘 풀리는 삶의 방향, 어떤 환경과 역할에서 빛나는지, 이 에너지로 살아갈 때 가장 행복하고 성공적인 삶이 무엇인지 구체적으로 담아주세요. 단순 격려가 아닌 사주에서 읽히는 실질적인 나침반을 제시해주세요.

4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'avoid',
    icon: '⚠️',
    label: '피해야 할 선택',
    prompt: `이 사람의 사주에서 피해야 할 선택과 패턴을 분석해주세요.

오행의 과잉·부족에서 비롯되는 반복적 실수, 에너지를 소진시키는 관계나 환경, 이 시기에 특히 조심해야 할 결정들을 구체적으로 담아주세요. 두렵게 만드는 게 아니라 미리 알고 피할 수 있도록 따뜻하고 실용적으로 써주세요.

4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'decision',
    icon: '🔑',
    label: '선택 앞 결정 조언',
    prompt: `중요한 선택의 기로에 섰을 때 이 사람이 어떻게 결정해야 하는지 조언해주세요.

이 사주의 기질로 볼 때 어떤 선택 방식이 맞는지, 직감을 믿어야 할 때와 신중하게 따져봐야 할 때, 지금 이 시기의 대운·세운 흐름에서 어떤 방향으로 무게를 실어야 하는지 구체적으로 담아주세요.

4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
];

/* ────────────────────────────────────────
   시스템 프롬프트
──────────────────────────────────────── */
const SAJU_EMAIL_SYSTEM = `당신은 사주명리학, 자미두수, 서양 점성술을 아우르는 동서양 명리 전문 상담사예요.
결제 고객에게 이메일로 전달될 사주 상세 리딩을 작성해주세요.

핵심 철학:
- 운명을 예언하는 게 아니라, 타고난 에너지로 지금 어떻게 살아야 하는지 방향을 제시해요
- "좋다/나쁘다"보다 "지금 이 시기에 당신이 해야 할 것"을 중심으로 이야기해요
- 과거 기질 분석 + 현재 흐름 + 앞으로의 행동 방향을 하나의 스토리로 연결해요
- 사용자의 불안감을 과도하게 자극하거나 불행을 단정하지 않아요
- 모든 흐름은 방향을 찾을 수 있도록 따뜻하게 제시해요
- 내담자 정보에 관계 상태가 명시된 경우 반드시 해당 상태에 맞게 관계운을 해석해요
- 기혼자에게 배우자 외 이성 인연·불륜·이혼을 암시하거나 단정하지 않아요
- 연애 중인 사람에게 현재 관계 외 새로운 인연을 예고하지 않아요

규칙:
- 반드시 해요체 사용
- 내담자의 이름·생년월일·사주팔자를 처음부터 직접 언급하며 완전히 개인화된 리딩
- 사주팔자(일간의 오행 성질, 오행 분포)를 핵심 축으로 해석
- 단순 운세 나열이 아니라 구체적인 행동 조언과 방향을 반드시 포함할 것
- 마크다운 기호(**굵게**, *기울임*, # 제목) 사용 금지
- 번호 목록이나 불릿 기호 사용 금지
- 순수한 텍스트만 사용할 것`;

/* ────────────────────────────────────────
   AI 호출
──────────────────────────────────────── */
async function generateReading(sajuContext, prompt) {
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
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.content[0].text;
}

/* ────────────────────────────────────────
   2026 시기 요약표 파싱 및 HTML 렌더
──────────────────────────────────────── */
function parseTimelineRow(line) {
  const m = line.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
  if (!m) return null;
  const [, month, energy, desc] = m;
  let color = '#b89e7e', bg = 'rgba(255,255,255,0.04)';
  const e = energy.trim();
  if (e === '기회') { color = '#e8c97a'; bg = 'rgba(201,168,76,0.10)'; }
  else if (e === '주의') { color = '#e8a060'; bg = 'rgba(220,120,60,0.10)'; }
  else if (e === '안정') { color = '#8ecfc0'; bg = 'rgba(80,180,160,0.08)'; }
  else if (e === '전환') { color = '#a48fd0'; bg = 'rgba(140,110,210,0.10)'; }
  return { month: month.trim(), energy: e, desc: desc.trim(), color, bg };
}

function renderTimelineHtml(raw) {
  const rows = raw.split('\n')
    .map(l => l.trim())
    .filter(l => l.includes('|'))
    .map(parseTimelineRow)
    .filter(Boolean);

  if (!rows.length) {
    return `<div style="color:#b89e7e;font-size:15px;line-height:2;white-space:pre-wrap">${raw}</div>`;
  }

  const legend = [
    { e:'기회', c:'#e8c97a' }, { e:'안정', c:'#8ecfc0' },
    { e:'전환', c:'#a48fd0' }, { e:'주의', c:'#e8a060' },
  ].map(l => `<span style="font-size:11px;color:${l.c};margin-right:12px">▸ ${l.e}</span>`).join('');

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:#ede0c8;white-space:nowrap;width:70px">${r.month}</td>
      <td style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="display:inline-block;background:${r.bg};color:${r.color};font-size:12px;font-weight:700;padding:2px 10px;border-radius:20px;border:1px solid ${r.color}40">${r.energy}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:#b89e7e;line-height:1.6">${r.desc}</td>
    </tr>`).join('');

  return `
    <div style="margin-bottom:8px">${legend}</div>
    <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.02);border-radius:10px;overflow:hidden">
      <thead>
        <tr style="background:rgba(201,168,76,0.07)">
          <th style="padding:10px 12px;font-size:12px;color:#c9a84c;text-align:left;font-weight:600;letter-spacing:.06em">월</th>
          <th style="padding:10px 8px;font-size:12px;color:#c9a84c;text-align:left;font-weight:600;letter-spacing:.06em">에너지</th>
          <th style="padding:10px 12px;font-size:12px;color:#c9a84c;text-align:left;font-weight:600;letter-spacing:.06em">흐름</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

/* ────────────────────────────────────────
   이메일 HTML 빌더
──────────────────────────────────────── */
function buildEmailHtml(name, sajuInfoLine, sections, closingMsg) {
  const sectionsHtml = sections.map(({ icon, label, content, isTimeline }) => {
    const bodyHtml = isTimeline
      ? renderTimelineHtml(content)
      : `<div style="color:#ede0c8;font-size:15px;line-height:2;white-space:pre-wrap">${content}</div>`;
    return `
    <div style="margin-bottom:40px">
      <h2 style="color:#c9a84c;font-size:17px;font-weight:700;border-bottom:1px solid rgba(201,168,76,0.25);padding-bottom:10px;margin:0 0 16px">${icon} ${label}</h2>
      ${bodyHtml}
    </div>`;
  }).join('');

  const closingHtml = `
    <div style="margin-top:8px;padding:24px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.18);border-radius:12px;text-align:center">
      <p style="color:#c9a84c;font-size:13px;letter-spacing:.12em;margin:0 0 10px">✦ 오속의 마무리 메시지 ✦</p>
      <p style="color:#ede0c8;font-size:15px;line-height:1.9;margin:0">${closingMsg}</p>
    </div>`;

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
      <p style="color:#b89e7e;font-size:13px;margin:0 0 6px">${sajuInfoLine}</p>
      <p style="color:rgba(184,158,126,0.5);font-size:11px;margin:0">본 리딩은 오속 사주 AI 기반 분석이에요 · 오락 및 참고 목적</p>
    </div>

    <!-- 본문 -->
    <div style="background:#10102a;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:32px 28px">
      ${sectionsHtml}
      ${closingHtml}
    </div>

    <!-- 푸터 -->
    <div style="text-align:center;color:rgba(184,158,126,0.5);font-size:12px;line-height:2;margin-top:32px;padding-top:24px;border-top:1px solid rgba(201,168,76,0.08)">
      <p style="margin:0">오속 사주 · osok-tarot.vercel.app/saju.html</p>
      <p style="margin:0">궁금한 점은 <a href="http://pf.kakao.com/_bSudX/chat" style="color:#c9a84c">카카오 채널</a>로 문의해주세요</p>
      <p style="margin:4px 0 0;font-size:11px">상호: 온나라 · 대표: 박지현 · 사업자등록번호: 602-23-61592</p>
    </div>

  </div>
</body>
</html>`;
}

/* ────────────────────────────────────────
   핸들러
──────────────────────────────────────── */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, sajuData, isPremium } = req.body;
  if (!email || !sajuData) return res.status(400).json({ error: 'missing fields' });

  try {
    const name = sajuData.name || '내담자';
    const sajuInfoLine = `${sajuData.year}년 ${sajuData.month}월 ${sajuData.day}일생 · ${sajuData.gender === 'm' ? '남성' : '여성'}`;
    const tier = sajuData.tier || (isPremium ? 'premium' : 'basic');

    const sections = [];

    /* 1. 질문 맞춤 답변 (customQuestion 있을 때만, 제일 먼저) */
    if (sajuData.customQuestion) {
      const questionTopic = sajuData.questionTopic ? `[${sajuData.questionTopic}] ` : '';
      const qPrompt = `${name}님의 질문: ${sajuData.customQuestion}

이 질문에 대해 ${name}님의 사주팔자를 바탕으로 깊이 있고 구체적인 답변을 작성해주세요.

먼저 이 질문과 관련된 사주 영역을 짚고, 현재 흐름에서 어떤 방향성이 보이는지, 구체적인 시기가 있다면 명확하게, 그리고 지금 당장 실천할 수 있는 행동 방향 1~2가지로 마무리해주세요.

4~5단락. 반드시 해요체, 마크다운 금지.`;
      const content = await generateReading(sajuData.context, qPrompt);
      sections.push({ icon: '💬', label: `${questionTopic}${name}님의 질문 맞춤 풀이`, content });
    }

    /* 2. 기본 카테고리 (순서: 연애 → 직업 → 재물 → 건강 → 운흐름) */
    const relStatus = sajuData.relationStatus || 'private';
    const loveCfg   = REL_LOVE_CONFIG[relStatus] || REL_LOVE_CONFIG.private;

    for (const cat of CATEGORY_PROMPTS) {
      let prompt = cat.prompt;
      let label  = cat.label;
      let icon   = cat.icon;

      // 연애 섹션: 관계 상태별 프롬프트·라벨 동적 생성
      if (cat.key === 'love') {
        label  = loveCfg.label;
        prompt = `${loveCfg.interp}

${name}님의 사주에서 관계·인연 영역을 깊이 분석해주세요.

분석 초점: ${loveCfg.focus}

핵심 결론 — 이 사람의 관계 기질과 현재 흐름의 핵심
사주 근거 — 어떤 오행·십성에서 이런 기질이 나오는지
지금 이 시기 — 올해 관계 에너지와 중요한 흐름
주의 — 반복되는 패턴이나 조심할 점
행동 방향 — 지금 당장 실천할 수 있는 구체적 방향

4~6단락으로 충분히 깊이 있게. 반드시 해요체, 마크다운 금지.`;
      }

      const content = await generateReading(sajuData.context, prompt);
      sections.push({ icon, label, content });
    }

    /* 3. 2026 핵심 시기 요약표 */
    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = now.getMonth() + 1;
    const timelinePrompt = `${name}님의 사주팔자를 바탕으로 ${startYear}년 ${startMonth}월부터 12개월간 핵심 시기를 분석해주세요.

각 달을 아래 형식으로 정확히 작성해주세요 (파이프 기호로 구분):
YYYY년 MM월 | 에너지 | 한 줄 설명

에너지는 반드시 다음 4가지 중 하나만 사용하세요: 기회, 안정, 전환, 주의

예시:
2026년 7월 | 기회 | 새로운 흐름이 시작되는 달이에요. 적극적으로 움직이면 결실이 생겨요.
2026년 8월 | 안정 | 내실을 다지기에 좋은 달이에요. 무리하지 않는 것이 이득이에요.
2026년 9월 | 주의 | 의사결정에 신중해야 하는 달이에요. 감정보다 냉정한 판단이 필요해요.

12개월 전부 작성. 다른 텍스트 없이 표 형식만.`;
    const timelineRaw = await generateReading(sajuData.context, timelinePrompt);
    sections.push({ icon: '📅', label: '2026 핵심 시기 요약', content: timelineRaw, isTimeline: true });

    /* 4. 지금부터 준비해야 할 것 */
    const actionPrompt = `${name}님의 사주팔자와 지금 시기의 운의 흐름을 바탕으로 "지금부터 준비해야 할 것"을 작성해주세요.

막연한 격려가 아닌, ${name}님의 기질과 지금 대운·세운 에너지에 딱 맞는 구체적 준비 방향을 담아주세요. 재물·관계·일·내면 등 중요한 영역에서 지금 당장 시작할 수 있는 것과 올해 안에 준비해야 할 것을 나눠서 이야기해주세요.

5~6단락. 반드시 해요체, 마크다운 금지.`;
    const actionContent = await generateReading(sajuData.context, actionPrompt);
    sections.push({ icon: '🚀', label: '지금부터 준비해야 할 것', content: actionContent });

    /* 5. 프리미엄 전용 추가 섹션 */
    if (tier === 'premium') {
      for (const cat of PREMIUM_PROMPTS) {
        const content = await generateReading(sajuData.context, cat.prompt);
        sections.push({ icon: cat.icon, label: cat.label, content });
      }
    }

    /* 6. 마무리 메시지 */
    const closingPrompt = `${name}님의 사주 리딩을 마무리하는 따뜻한 메시지를 3~4문장으로 작성해주세요. 이 사람의 기질과 지금 시기의 에너지를 담아 개인화되게. 반드시 해요체, 마크다운 금지.`;
    const closingMsg = await generateReading(sajuData.context, closingPrompt);

    const html = buildEmailHtml(name, sajuInfoLine, sections, closingMsg);

    /* 이메일 발송 (Resend) */
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

    /* Redis 정리 */
    await redis.del(`saju_pending:${email.toLowerCase().trim()}`);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
