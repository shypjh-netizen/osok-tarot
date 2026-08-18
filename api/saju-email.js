import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
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
    console.error('[saju-email][notifyAdmin] failed:', e.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   고민 카테고리 매핑
───────────────────────────────────────────────────────────── */
const FOCUS_TOPIC_MAP = {
  work:     '일·이직',
  money:    '재물·수입',
  business: '사업·부업',
  love:     '관계·연애',
  marriage: '결혼생활',
  family:   '가족',
  year:     '올해의 흐름',
  custom:   '직접 질문',
};

/* ─────────────────────────────────────────────────────────────
   관계 상태별 종합 리딩 설정 (basic / premium 전용)
───────────────────────────────────────────────────────────── */
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
    interp: '이 사람은 기혼이에요. 배우자와의 관계·부부 소통·가정 흐름 중심으로 해석해주세요. "새로운 연애가 시작됩니다", "새로운 이성이 나타납니다", "운명적인 상대를 만납니다" 등 배우자 외 인연 암시 표현은 절대 사용하지 마세요.',
    focus: '배우자와의 감정적 교류, 부부 간 소통과 갈등, 가정생활의 변화, 함께 결정해야 할 재정·생활 문제, 서로의 역할과 거리 조절',
  },
  separated: {
    label: '관계의 회복과 새로운 인연',
    interp: '이 사람은 이별·이혼 후 솔로 상태예요. 감정 회복·관계 패턴 이해·새로운 인연의 가능성 중심으로 해석해주세요.',
    focus: '과거 관계에서 회복해야 할 부분, 반복되는 관계 패턴, 감정적으로 새로운 관계를 받아들일 준비, 새로운 인연의 가능성과 시기',
  },
  private: {
    label: '인연과 관계의 흐름',
    interp: '관계 상태를 답변하지 않았어요. 중립적으로 관계와 인연 에너지만 설명해주세요.',
    focus: '가까운 사람들과의 관계 흐름, 감정 표현과 소통 방식, 관계에서 반복되는 패턴',
  },
};

/* ─────────────────────────────────────────────────────────────
   종합 리딩 카테고리 프롬프트 (basic / premium)
───────────────────────────────────────────────────────────── */
const CATEGORY_PROMPTS = [
  { key: 'love',   icon: '💕', label: null, prompt: null }, // 동적 생성
  {
    key: 'career', icon: '💼', label: '직업 & 적성 심층 분석',
    prompt: `직업과 적성 영역을 깊이 분석해주세요.
핵심 결론, 사주 근거, 강점, 주의점, 올해 커리어 흐름과 적기, 지금 실천할 행동 방향 1~2가지.
4~6단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'money', icon: '💰', label: '금전 & 재물 심층 분석',
    prompt: `금전과 재물 영역을 깊이 분석해주세요.
핵심 결론, 사주 근거, 재물이 들어오는 방식, 돈이 새는 패턴, 올해 재물 흐름, 지금 실천할 방향 1~2가지.
4~6단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'health', icon: '🌿', label: '건강 & 활력 분석',
    prompt: `건강과 활력 영역을 분석해주세요.
체질적 특성, 주의해야 할 신체 부위, 에너지가 떨어지는 시기, 건강을 지키는 생활 습관.
3~4단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'flow', icon: '🌊', label: '운의 큰 흐름 (1~3년)',
    prompt: `앞으로 1~3년간 운의 큰 흐름을 분석해주세요.
지금 어떤 대운·세운 속에 있는지, 언제 기회가 오고 언제 조심해야 하는지, 이 흐름을 잘 타기 위한 방향.
4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
];

const PREMIUM_PROMPTS = [
  {
    key: 'direction', icon: '🧭', label: '인생 방향 조언',
    prompt: `이 사람의 사주팔자와 오행 에너지를 바탕으로 인생 방향 조언을 깊이 있게 작성해주세요.
타고난 기질로 가장 잘 풀리는 삶의 방향, 어떤 환경과 역할에서 빛나는지, 실질적인 나침반을 제시해주세요.
4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'avoid', icon: '⚠️', label: '피해야 할 선택',
    prompt: `이 사람의 사주에서 피해야 할 선택과 패턴을 분석해주세요.
오행의 과잉·부족에서 비롯되는 반복적 실수, 에너지를 소진시키는 관계나 환경, 지금 특히 조심해야 할 결정들.
두렵게 만들지 말고 따뜻하고 실용적으로. 4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
  {
    key: 'decision', icon: '🔑', label: '선택 앞 결정 조언',
    prompt: `중요한 선택의 기로에 섰을 때 이 사람이 어떻게 결정해야 하는지 조언해주세요.
이 사주의 기질로 볼 때 어떤 선택 방식이 맞는지, 직감을 믿어야 할 때와 신중하게 따져봐야 할 때, 지금 시기의 흐름에서 어떤 방향으로 무게를 실어야 하는지.
4~5단락. 반드시 해요체, 마크다운 금지.`,
  },
];

/* ─────────────────────────────────────────────────────────────
   현재 연도·세운 추출 (fortuneTiming 우선, 서버 계산 fallback)
───────────────────────────────────────────────────────────── */
function extractYearInfo(sajuData) {
  const ft = sajuData?.fortuneTiming;
  if (ft?.currentSewoon?.pillar) {
    const sw = ft.currentSewoon;
    const periodStart = sw.periodStart || sw.ipchun || '';
    const year = periodStart ? parseInt(periodStart.slice(0, 4)) : null;
    if (year && year >= 2020 && year <= 2050) {
      return { year, sewoon: sw.pillar, periodStart, periodEnd: sw.periodEnd || '' };
    }
    // displayYear fallback
    if (sw.displayYear && sw.displayYear >= 2020) {
      return { year: sw.displayYear, sewoon: sw.pillar, periodStart: '', periodEnd: '' };
    }
  }
  // 서버 계산 fallback (KST, 입춘 2월 4일 근사)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const m = now.getMonth() + 1, d = now.getDate(), y = now.getFullYear();
  const sewoonYear = (m === 1 || (m === 2 && d < 4)) ? y - 1 : y;
  return { year: sewoonYear, sewoon: null, periodStart: '', periodEnd: '' };
}

/* ─────────────────────────────────────────────────────────────
   입력 검증
───────────────────────────────────────────────────────────── */
function validateSajuInput(sajuData, tier) {
  const errors = [];
  if (!sajuData) { errors.push('sajuData_missing'); return errors; }
  if (!sajuData.year || !sajuData.month || !sajuData.day) errors.push('missing_birth_date');
  if (!sajuData.gender) errors.push('missing_gender');
  if (!sajuData.context) errors.push('missing_context');
  if (!tier || !['single', 'premium', 'basic'].includes(tier)) errors.push(`invalid_tier:${tier}`);

  if (tier === 'single') {
    const cat = sajuData.concern?.category;
    if (!cat || cat === 'none') errors.push('single_missing_concern');
    // single 티어가 premium 프롬프트로 넘어가지 않도록 (티어 혼용 방지는 라우팅으로 처리)
  }

  // 연도 일관성 확인
  const { year: storedYear } = extractYearInfo(sajuData);
  const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const nm = nowKST.getMonth() + 1, nd = nowKST.getDate(), ny = nowKST.getFullYear();
  const serverSewoonYear = (nm === 1 || (nm === 2 && nd < 4)) ? ny - 1 : ny;
  if (storedYear && Math.abs(storedYear - serverSewoonYear) > 1) {
    console.error(`[saju-email][validation] year_mismatch stored=${storedYear} server=${serverSewoonYear}`);
    errors.push(`year_mismatch:stored=${storedYear},server=${serverSewoonYear}`);
  }

  return errors;
}

/* ─────────────────────────────────────────────────────────────
   동적 시스템 프롬프트 (연도·세운 명시)
───────────────────────────────────────────────────────────── */
function buildSystemPrompt(currentYear, currentSewoon) {
  const yearLine = currentSewoon
    ? `분석 기준: ${currentYear}년 ${currentSewoon} 세운. 이 세운·연도만 "올해" 또는 "현재"로 사용하세요. 과거 연도(2025년·을사 등)를 절대 현재로 표현하지 마세요.`
    : `분석 기준: ${currentYear}년. 이 연도만 "올해"로 사용하세요.`;

  return `당신은 사주명리학 전문 상담사예요. 결제 고객에게 이메일로 전달될 사주 리딩을 작성합니다.

${yearLine}

[핵심 원칙]
- 사주명리학(원국·대운·세운)만 사용하세요. 서양 점성술(별자리·전갈자리 등)·타로·수비학을 혼합하지 마세요.
- 운명을 예언하는 게 아니라 타고난 에너지와 지금 흐름에서 방향을 제시해요.
- 불안을 과도하게 자극하거나 불행을 단정하지 마세요.

[대운·세운 구분 — 반드시 지킬 것]
- 대운(大運)과 세운(歲運)은 다른 데이터입니다. 절대 혼동하지 마세요.
- 대운: 약 10년 주기, 사주 원국에서 계산된 구간 (예: 甲午 대운 2019~2029)
- 세운: 해당 연도의 간지 (예: 2026년 丙午, 2027년 丁未)
- "2027년 丁未 대운" 같은 표현은 오류입니다. 丁未는 세운이에요.
- 대운 전환 날짜는 실제 계산된 값이 있을 때만 "○년 ○월 ○일부터" 라고 쓰세요. 없으면 날짜를 추정하지 마세요.

[명리 해석 규칙]
- 해석은 반드시: 원국 구조 → 일간과 월령 → 십성 관계 → 오행 생극제화 → 대운 → 세운 → 질문 순서로 연결하세요.
- 오행 개수 하나만으로 성격·재물·행동을 직접 연결하지 마세요. (예: "금이 0개이므로 직관적 판단에 강하다" 금지)
- 같은 오행을 한 리딩 안에서 상반된 의미로 쓰지 마세요. (예: 화火를 "안정 강화"라고 했다가 "변화 추구"라고 하면 안 됨)
- 신살(도화·천을귀인 등)은 실제 계산된 것만 쓰세요. 없는 신살을 만들거나 퍼센트를 임의 부여하지 마세요.

[사용자 정보 규칙]
- 사용자가 입력한 것만 사실로 사용하세요: 생년월일·성별·결혼 여부·선택한 고민·직접 질문.
- 입력하지 않은 것을 가정하지 마세요: 직업·수입·투자 여부·사업 여부·자녀·보유 자산.
- "상사와 급여 협상", "주식 포트폴리오 재구성", "거래처를 늘리세요" 등 직업·자산 가정 문장 금지.
- 관계 상태(기혼·미혼)는 보조 맥락입니다. 선택한 고민 주제를 덮어쓰지 마세요.

[결론 일관성 규칙]
- 하나의 리딩에서 핵심 결론은 반드시 하나여야 합니다.
- "새로운 것을 해야 한다"와 "새로운 것을 하지 말아야 한다"를 동시에 결론으로 쓰지 마세요.
- 각 섹션은 앞 섹션의 결론과 충돌하지 않아야 합니다.

[날짜 규칙]
- 과거 날짜(1월 1일 등)를 하드코딩하지 마세요. 날짜가 주어지면 그 기준으로 쓰세요.
- 대운 전환 날짜를 임의로 만들지 마세요.

[형식 규칙]
- 반드시 해요체 사용
- 마크다운 기호 (**굵게**, *기울임*, # 제목) 사용 금지
- 번호 목록·불릿 기호 사용 금지
- 순수한 텍스트만 사용`;
}

/* ─────────────────────────────────────────────────────────────
   AI 호출
───────────────────────────────────────────────────────────── */
async function generateReading(sajuContext, prompt, systemPrompt, maxTokens = 2200) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: sajuContext },
        { role: 'assistant', content: '네, 사주팔자를 바탕으로 상세 리딩을 시작할게요.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  if (data.stop_reason === 'max_tokens') {
    throw new Error(`max_tokens_reached(limit=${maxTokens}): 출력이 잘렸어요`);
  }
  return data.content[0].text;
}

/* ─────────────────────────────────────────────────────────────
   시기 요약표 파싱·HTML 렌더 (종합 리딩용)
───────────────────────────────────────────────────────────── */
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

/* ─── 문장 완결성 검증 ─── */
const SENTENCE_ENDINGS = ['요', '다', '죠', '세요', '하세요', '됩니다', '입니다', '.', '!', '?', '~', '행동', '실천', '시작', '확인', '점검', '준비', '유지', '집중', '도전', '진행'];
const BAD_ENDINGS = ['을', '를', '이', '가', '은', '는', '에', '에서', '로', '으로', '와', '과', '그리고', '하지만', '때문에', '이런 구조', '어떤 형태로', '관련된', '1주차에', '2주차에', '3주차에'];

function validateContent(content, fieldName = '') {
  if (!content || typeof content !== 'string') return { ok: false, reason: `${fieldName}:empty` };
  const trimmed = content.trim();
  if (trimmed.length < 60) return { ok: false, reason: `${fieldName}:too_short(${trimmed.length})` };

  const openParens  = (trimmed.match(/\(/g)  || []).length;
  const closeParens = (trimmed.match(/\)/g)  || []).length;
  if (openParens > closeParens) return { ok: false, reason: `${fieldName}:unclosed_paren` };

  const goodEnd = SENTENCE_ENDINGS.some(e => trimmed.endsWith(e));
  const badEnd  = BAD_ENDINGS.some(e => trimmed.endsWith(e));

  if (badEnd)  return { ok: false, reason: `${fieldName}:bad_ending("${trimmed.slice(-6)}")` };
  if (!goodEnd) return { ok: false, reason: `${fieldName}:suspicious_ending("${trimmed.slice(-4)}")` };

  return { ok: true };
}

function validate30DayPlan(content) {
  if (!content) return { ok: false, reason: '30day:empty' };
  const weeks = ['1주차', '2주차', '3주차', '4주차'];
  const missing = weeks.filter(w => !content.includes(w));
  if (missing.length > 0) return { ok: false, reason: `30day:missing(${missing.join(',')})` };
  if (!content.includes('22~30') && !content.includes('22일') && !content.includes('4주')) {
    return { ok: false, reason: '30day:4th_week_incomplete' };
  }
  return validateContent(content, '30day');
}

/* ─── 금지 문구 감지 (모델이 되묻거나 중간 작업 노출 시 차단) ─── */
const FORBIDDEN_PHRASES = [
  '죄송합니다', '제공된 데이터에는', '정보가 없어요', '정보가 없습니다',
  '작성할 수 없', '어느 방식을 원하시나요', '선택해주세요', '선택해 주세요',
  '추가 정보를 제공', '다음 방식으로 도움', '방식 중 하나를 선택',
  '월별 세운을 임의로', '월 단위의 세운 간지', '명리학적 오류가 되므로',
  '위의 내용을 어떻게', '어떤 방향으로 작성',
];

function hasForbiddenPhrase(text) {
  if (!text || typeof text !== 'string') return null;
  return FORBIDDEN_PHRASES.find(p => text.includes(p)) || null;
}

function validatePremiumContent(content, fieldName = '') {
  const found = hasForbiddenPhrase(content);
  if (found) return { ok: false, reason: `${fieldName}:forbidden("${found.slice(0, 18)}")` };
  return validateContent(content, fieldName);
}

/* ─── 생성 + 재시도 래퍼 ─── */
async function generateWithRetry(ctx, prompt, systemPrompt, maxTokens, validator, maxRetries = 2) {
  let lastContent = null;
  let lastReason  = 'unknown';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const tryPrompt = attempt > 0
        ? prompt + '\n\n[주의] 모든 문장을 반드시 완결해주세요. 단락 마지막이 조사(을/를/이/가 등)나 연결어로 끊기지 않게 해주세요.'
        : prompt;
      const content = await generateReading(ctx, tryPrompt, systemPrompt, maxTokens);
      const result  = validator ? validator(content) : { ok: true };
      if (result.ok) return { content, ok: true };
      lastContent = content;
      lastReason  = result.reason;
      console.error(`[saju-email][retry] attempt=${attempt} reason=${result.reason} len=${content?.length}`);
    } catch (e) {
      lastReason = e.message;
      console.error(`[saju-email][retry] attempt=${attempt} error=${e.message}`);
    }
  }
  return { content: lastContent, ok: false, reason: lastReason };
}

/* ─── 연도별 흐름 카드 렌더 (JSON 파싱, 모바일 카드 레이아웃) ─── */
function parseYearFlowsJson(raw) {
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) return null;
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr) || arr.length < 1) return null;
    return arr;
  } catch {
    return null;
  }
}

function renderFocusYearCards(raw) {
  const rows = parseYearFlowsJson(raw);
  const nowYear = new Date().getFullYear();
  if (!rows) {
    return `<div style="color:#ede0c8;font-size:14px;line-height:1.85;white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word">${escHtml(raw)}</div>`;
  }
  return rows.map((r, i) => {
    const isThisYear = Number(r.year) === nowYear;
    const cardBg = isThisYear ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)';
    const cardBrdr = isThisYear ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)';
    const badge = isThisYear ? `<span style="background:#c9a84c;color:#07071a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:8px;vertical-align:middle">올해</span>` : '';
    return `<div style="background:${cardBg};border:1px solid ${cardBrdr};border-radius:10px;padding:16px 18px;margin-bottom:12px;word-break:keep-all;overflow-wrap:break-word">
      <p style="color:#c9a84c;font-size:14px;font-weight:700;margin:0 0 10px">${escHtml(String(r.year))}년 · ${escHtml(r.sewoon || '')}${badge}</p>
      <p style="color:#ede0c8;font-size:13px;line-height:1.8;margin:0 0 10px">${escHtml(r.flow || '')}</p>
      <p style="color:#7ecfbe;font-size:12px;font-weight:700;margin:0 0 3px">▶ 밀어야 할 행동</p>
      <p style="color:#ede0c8;font-size:13px;line-height:1.75;margin:0 0 8px">${escHtml(r.action || '')}</p>
      <p style="color:#d07060;font-size:12px;font-weight:700;margin:0 0 3px">✕ 주의할 선택</p>
      <p style="color:#ede0c8;font-size:13px;line-height:1.75;margin:0">${escHtml(r.caution || '')}</p>
    </div>`;
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────────────────────────
   이메일 HTML 빌더
───────────────────────────────────────────────────────────── */
/* ─── 30일 체크리스트 렌더러 ─── */
function renderChecklistHtml(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  let html = '';
  let currentWeek = '';

  for (const line of lines) {
    const weekMatch = line.match(/^(\d)주차/);
    const goalMatch = line.match(/^목표[:\s：]+(.+)/);
    const actionMatch = line.match(/^[□·\-\*]\s*(.+)/) || line.match(/^행동\s*\d?[:\s：]?\s*(.+)/);
    const afterMatch = line.match(/^30일\s*후?\s*확인/);

    if (weekMatch) {
      if (currentWeek) html += '</div>';
      currentWeek = weekMatch[0];
      const weekLabels = ['', '1주차', '2주차', '3주차', '4주차'];
      const wNum = parseInt(weekMatch[1]);
      html += `<div style="margin-bottom:20px">
        <p style="color:#c9a84c;font-size:14px;font-weight:700;margin:0 0 8px;border-left:3px solid #c9a84c;padding-left:10px">${weekLabels[wNum] || line}</p>`;
    } else if (goalMatch) {
      html += `<p style="color:#b89e7e;font-size:13px;margin:0 0 8px;line-height:1.6;word-break:keep-all">${escHtml(goalMatch[1])}</p>`;
    } else if (actionMatch) {
      html += `<p style="color:#ede0c8;font-size:14px;margin:0 0 6px;line-height:1.75;padding-left:4px;word-break:keep-all">□ ${escHtml(actionMatch[1])}</p>`;
    } else if (afterMatch) {
      if (currentWeek) { html += '</div>'; currentWeek = ''; }
      html += `<div style="margin-top:16px;padding:14px 16px;background:rgba(201,168,76,0.06);border-radius:10px;border-left:3px solid rgba(201,168,76,0.4)">
        <p style="color:#c9a84c;font-size:13px;font-weight:700;margin:0 0 6px">30일 후 확인할 변화</p>
        <p style="color:#ede0c8;font-size:14px;line-height:1.75;margin:0;word-break:keep-all">${escHtml(line.replace(/^30일\s*후?\s*확인[할]?\s*변화[:\s：]*/, '').trim())}</p>
      </div>`;
    } else if (line && currentWeek) {
      /* 주차 내부의 일반 텍스트도 행동 항목으로 렌더 */
      html += `<p style="color:#ede0c8;font-size:14px;margin:0 0 6px;line-height:1.75;padding-left:4px;word-break:keep-all">${escHtml(line)}</p>`;
    }
  }
  if (currentWeek) html += '</div>';
  return html || `<div style="color:#ede0c8;font-size:14px;line-height:1.85;white-space:pre-wrap;word-break:keep-all">${escHtml(content)}</div>`;
}

function buildEmailHtml(name, headerMeta, sections, closingMsg, productLabel, summaryCard) {
  /* ── 공통 스타일 토큰 ── */
  const C = {
    bg:        '#07071a',   // 전체 배경
    card:      '#0f0f2a',   // 일반 카드
    cardBrdr:  'rgba(201,168,76,0.18)',
    gold:      '#c9a84c',
    goldDim:   'rgba(201,168,76,0.35)',
    ivory:     '#ede0c8',   // 본문 텍스트
    sub:       '#b89e7e',   // 보조 텍스트
    pushBg:    'rgba(60,160,140,0.07)',
    pushBrdr:  'rgba(60,160,140,0.3)',
    pushLabel: '#7ecfbe',
    avoidBg:   'rgba(180,70,50,0.07)',
    avoidBrdr: 'rgba(180,70,50,0.3)',
    avoidLabel:'#d07060',
    choiceBg:  'rgba(120,100,190,0.07)',
    choiceBrdr:'rgba(120,100,190,0.28)',
    choiceLabel:'#a48fd0',
  };

  /* ── 요약 카드 (말줄임표 없음 — 높이 자동) ── */
  const summaryHtml = summaryCard ? `
    <div style="margin-bottom:20px;padding:22px 20px;background:${C.card};border:1px solid ${C.goldDim};border-radius:14px">
      <p style="color:${C.gold};font-size:11px;letter-spacing:3px;margin:0 0 16px;text-align:center">✦ 리딩 핵심 요약 ✦</p>
      <div style="margin-bottom:12px;padding:14px 16px;background:rgba(201,168,76,0.06);border-left:3px solid ${C.gold};border-radius:0 8px 8px 0">
        <p style="color:${C.gold};font-size:11px;font-weight:700;margin:0 0 6px;letter-spacing:1px">핵심 결론</p>
        <p style="color:${C.ivory};font-size:14px;line-height:1.8;margin:0;word-break:keep-all;overflow-wrap:break-word">${escHtml(summaryCard.핵심결론 || '')}</p>
      </div>
      ${summaryCard.밀어야할방향 ? `<div style="margin-bottom:10px;padding:12px 14px;background:${C.pushBg};border-left:3px solid ${C.pushLabel};border-radius:0 8px 8px 0">
        <p style="color:${C.pushLabel};font-size:11px;font-weight:700;margin:0 0 5px">▶ 지금 밀어야 할 방향</p>
        <p style="color:${C.ivory};font-size:14px;line-height:1.8;margin:0;word-break:keep-all;overflow-wrap:break-word">${escHtml(summaryCard.밀어야할방향)}</p>
      </div>` : ''}
      ${summaryCard.피해야할선택 ? `<div style="margin-bottom:10px;padding:12px 14px;background:${C.avoidBg};border-left:3px solid ${C.avoidLabel};border-radius:0 8px 8px 0">
        <p style="color:${C.avoidLabel};font-size:11px;font-weight:700;margin:0 0 5px">✕ 지금 피해야 할 선택</p>
        <p style="color:${C.ivory};font-size:14px;line-height:1.8;margin:0;word-break:keep-all;overflow-wrap:break-word">${escHtml(summaryCard.피해야할선택)}</p>
      </div>` : ''}
      ${summaryCard.첫행동 ? `<div style="padding:12px 14px;background:${C.choiceBg};border-left:3px solid ${C.choiceLabel};border-radius:0 8px 8px 0">
        <p style="color:${C.choiceLabel};font-size:11px;font-weight:700;margin:0 0 5px">□ 앞으로 30일 — 첫 행동</p>
        <p style="color:${C.ivory};font-size:14px;line-height:1.8;margin:0;word-break:keep-all;overflow-wrap:break-word">${escHtml(summaryCard.첫행동)}</p>
      </div>` : ''}
    </div>` : '';

  /* ── 섹션 카드 ── */
  const sectionsHtml = sections.map(({ icon, label, content, isTimeline, isFocusTimeline, focusType, is30DayPlan }) => {
    let bodyHtml;
    if (isTimeline) {
      bodyHtml = renderTimelineHtml(content);
    } else if (isFocusTimeline) {
      bodyHtml = renderFocusYearCards(content);
    } else if (is30DayPlan) {
      bodyHtml = renderChecklistHtml(content);
    } else {
      bodyHtml = `<div style="color:${C.ivory};font-size:14px;line-height:1.85;white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word">${escHtml(content)}</div>`;
    }

    let bg = C.card, brdr = C.cardBrdr, lc = C.gold, lBrdr = C.gold;
    if (focusType === 'push')   { bg = C.pushBg;   brdr = C.pushBrdr;   lc = C.pushLabel;   lBrdr = C.pushLabel; }
    if (focusType === 'avoid')  { bg = C.avoidBg;  brdr = C.avoidBrdr;  lc = C.avoidLabel;  lBrdr = C.avoidLabel; }
    if (focusType === 'choices'){ bg = C.choiceBg; brdr = C.choiceBrdr; lc = C.choiceLabel; lBrdr = C.choiceLabel; }

    return `<div style="background:${bg};border:1px solid ${brdr};border-radius:12px;padding:20px 20px 22px;margin-bottom:16px">
      <h2 style="color:${lc};font-size:15px;font-weight:700;border-bottom:1px solid ${brdr};padding-bottom:9px;margin:0 0 14px;line-height:1.5;word-break:keep-all">${icon} ${label}</h2>
      ${bodyHtml}
    </div>`;
  }).join('');

  const closingHtml = closingMsg ? `
    <div style="margin-top:4px;padding:20px 20px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.18);border-radius:12px">
      <p style="color:${C.gold};font-size:11px;letter-spacing:.1em;margin:0 0 10px;text-align:center">✦ 오속의 마무리 메시지 ✦</p>
      <p style="color:${C.ivory};font-size:14px;line-height:1.85;margin:0;word-break:keep-all;overflow-wrap:break-word">${escHtml(closingMsg)}</p>
    </div>` : '';

  const headerExtra = headerMeta.topicLine
    ? `<p style="color:${C.gold};font-size:13px;margin:6px 0 2px;font-weight:600">${escHtml(headerMeta.topicLine)}</p>
       <p style="color:${C.sub};font-size:12px;margin:0">${escHtml(headerMeta.basisLine || '')}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(name)}님의 오속 사주 리딩</title>
</head>
<body style="background:${C.bg};margin:0;padding:0;font-family:Georgia,'Noto Serif KR',serif">
  <div style="max-width:680px;margin:0 auto;padding:36px 16px 48px">

    <div style="text-align:center;margin-bottom:28px;padding:28px 20px 24px;background:${C.card};border:1px solid ${C.cardBrdr};border-radius:14px">
      <p style="color:${C.gold};font-size:11px;letter-spacing:4px;margin:0 0 10px">✦ 오속 사주 ✦</p>
      ${productLabel ? `<p style="color:${C.choiceLabel};font-size:12px;letter-spacing:2px;margin:0 0 10px">${escHtml(productLabel)}</p>` : ''}
      <h1 style="color:${C.ivory};font-size:20px;line-height:1.65;margin:0 0 12px;font-weight:700">${escHtml(name)}님의 사주 리딩이 도착했어요</h1>
      <p style="color:${C.sub};font-size:13px;margin:0 0 4px">${escHtml(headerMeta.infoLine || '')}</p>
      ${headerExtra}
      <p style="color:rgba(184,158,126,0.45);font-size:11px;margin:10px 0 0">본 리딩은 오속 사주 AI 기반 분석이에요 · 오락 및 참고 목적</p>
    </div>

    ${summaryHtml}

    <div style="background:${C.card};border:1px solid ${C.cardBrdr};border-radius:14px;padding:20px 16px 24px">
      ${sectionsHtml}
      ${closingHtml}
    </div>

    <div style="text-align:center;color:rgba(184,158,126,0.45);font-size:12px;line-height:2;margin-top:28px;padding-top:20px;border-top:1px solid rgba(201,168,76,0.08)">
      <p style="margin:0">오속 사주 · www.osok.kr/saju.html</p>
      <p style="margin:0">궁금한 점은 <a href="http://pf.kakao.com/_bSudX/chat" style="color:${C.gold}">카카오 채널</a>로 문의해주세요</p>
      <p style="margin:4px 0 0;font-size:11px">상호: 온나라 · 대표: 박지현 · 사업자등록번호: 602-23-61592</p>
    </div>

  </div>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
   주제별 설정 (집중 리딩 4,900원)
───────────────────────────────────────────────────────────── */
const TOPIC_CONFIG = {
  year:     { relLimit: 25, autoChoices: true  },
  work:     { relLimit: 15, autoChoices: false },
  money:    { relLimit: 15, autoChoices: false },
  business: { relLimit: 15, autoChoices: false },
  love:     { relLimit: 90, autoChoices: false },
  marriage: { relLimit: 90, autoChoices: false },
  family:   { relLimit: 60, autoChoices: false },
  custom:   { relLimit: 25, autoChoices: false },
};

/* ─────────────────────────────────────────────────────────────
   집중 리딩 생성 (single 티어 4,900원)
   returns { sections, closingMessage }
───────────────────────────────────────────────────────────── */
async function generateFocusReading(sajuData, ctx, name, currentYear, currentSewoon, systemPrompt) {
  const concern    = sajuData.concern || {};
  const cat        = concern.category || 'year';
  const topicLabel = concern.label || FOCUS_TOPIC_MAP[cat] || cat;
  const question   = concern.question || '';
  const relStatus  = sajuData.relationStatus || 'private';
  const tCfg       = TOPIC_CONFIG[cat] || TOPIC_CONFIG.custom;
  const sections   = [];
  const failedSections = [];

  const yr = currentYear;
  const sw = currentSewoon || `${yr}년 세운`;
  const yearNote = `※ 분석 기준: ${yr}년 ${sw}. "${yr}년"만 "올해"로 사용하세요. 2025년·을사를 절대 현재로 표현하지 마세요.`;
  const qNote    = question ? `직접 질문: "${question}"` : '';
  const completeNote = `\n[필수] 모든 문장을 완전하게 끝내주세요. 단락 마지막이 조사(을/를/이/가/에서 등)나 연결어로 끊기지 않도록 하세요.`;

  /* 관계 상태 문자열 */
  const relStatusLabel = {
    single: '미혼·솔로', dating: '연애 중', engaged: '약혼', married: '기혼',
    separated: '별거·이혼 중', widowed: '사별', private: '미공개',
  }[relStatus] || relStatus;

  /* 주제별 관계 제한 지시 */
  const relNote = tCfg.relLimit <= 30
    ? `[주제 우선순위 규칙] 선택 주제는 [${topicLabel}]입니다. 관계 상태(${relStatusLabel})는 보조 맥락으로만 사용하세요. 배우자·결혼생활·관계 관련 내용은 선택 주제와 직접 관련된 경우에만 짧게 언급하고, 전체 내용의 ${tCfg.relLimit}% 이하로 제한하세요. 기혼이라는 이유만으로 전체를 결혼생활 리딩으로 바꾸지 마세요.`
    : `관계 상태: ${relStatusLabel}. 이 분야가 선택된 주제이므로 관련 내용을 중심으로 분석하세요.`;

  /* ── 세운 연도 정보 (AI 오류 방지용 명시) ── */
  const sewoonRef = `[세운 정보 — 반드시 이 값만 사용]
- 2026년 세운: 병오(丙午) — 병화·오화
- 2027년 세운: 정미(丁未) — 정화·미토
- 2028년 세운: 무신(戊申) — 무토·신금
- 세운 간지를 대운처럼 표현하지 마세요. 예: "2027년 정미 대운" 금지 → "2027년 정미 세운"으로 표현.
- 대운 전환이 실제 계산되지 않은 연도에서는 대운 전환을 언급하지 마세요.`;

  /* ── 금지 사항 공통 지시 (모든 프롬프트에 삽입) ── */
  const prohibitNote = `
[금지 사항 — 반드시 지킬 것]
- 서양 점성술(별자리·전갈자리 등) 혼합 금지.
- 사용자가 입력하지 않은 정보를 사실처럼 가정하지 마세요: 직업·수입·투자 여부·사업 여부·자산·부채·고정수입·공동자산. "안정적인 자산 관리 기반"처럼 자산 상태를 단정하는 표현 금지. 정보가 없으면 조건부로: "현재 유지 중인 수입원이 있다면" / "새로운 수입 가능성을 작은 규모로 검증".
- "상사와 급여 협상", "주식·펀드 재구성", "거래처 확대" 등 직업·자산 전제 문장 금지.
- 오행 개수만으로 성격·재물·행동을 단정하지 마세요. 일간·월령·통근·합충·대운·세운 종합 해석 필수.
- 2028년 무신 세운에서 근거 없이 목·수가 "들어온다"고 쓰지 마세요. 지장간·합충 근거 명시 필수.
- 같은 오행을 같은 리딩에서 모순된 의미로 쓰지 마세요.
- 대운과 세운 혼동 금지. ${sewoonRef}
- 없는 신살 생성·임의 퍼센트 부여 금지.
- 핵심 결론과 충돌하는 방향 제시 금지.
- 앞 섹션에서 설명한 원국·일간·오행 근거를 뒤 섹션에서 반복하지 마세요.
- 안내문·소개문·예고문으로 시작하지 마세요. 금지 표현: "분석한 결과입니다", "구체적인 행동 지침입니다", "살펴보겠습니다", "정리해드릴게요", "확인해보세요", "도움이 되는 방향입니다", "흐름을 안내해드릴게요", "아래에서 설명하겠습니다".`;

  /* ── 리딩 생성일 (날짜 기준) ── */
  const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const genDateStr = `${nowKST.getFullYear()}년 ${nowKST.getMonth() + 1}월 ${nowKST.getDate()}일`;
  const w1Start = nowKST.getDate(), w1End = nowKST.getDate() + 6;
  const w2Start = nowKST.getDate() + 7, w2End = nowKST.getDate() + 13;
  const w3Start = nowKST.getDate() + 14, w3End = nowKST.getDate() + 20;
  const w4Start = nowKST.getDate() + 21, w4End = nowKST.getDate() + 29;
  const dateNote = `리딩 생성일: ${genDateStr}. 30일 계획은 이 날짜를 기준으로 작성하세요. 과거 날짜(1월 1일 등)를 하드코딩하지 마세요.`;

  /* ── yearCore: 올해의 핵심 해석 (year 주제 전용, 섹션 간 결론 통일용) ── */
  let yearCore = null;
  if (cat === 'year') {
    const corePrompt = `${name}님의 사주와 ${yr}년 ${sw} 세운을 분석해 아래 JSON만 출력하세요. 다른 텍스트 없이 JSON만.

각 필드 규칙:
- coreDirection: "무엇을 우선해야 하는가"에 직접 답하는 완결 문장. "분석한 결과입니다", "살펴보겠습니다" 같은 안내문 금지. 예: "기존 기반을 지키면서 재물 가능성 하나를 작게 검증하는 방향이 적합합니다."
- pushSummary: 사용자가 지금 해야 할 행동을 동사로 제시. 안내문 금지. 예: "수입 가능성 한 가지를 골라 시간·비용 한도를 정해 검증하세요."
- avoidSummary: 하지 말아야 할 행동을 구체적으로 제시. pushSummary와 반대되는 내용. 안내문 금지. 예: "검증 전에 큰 비용이나 시간을 먼저 투입하거나 여러 방향을 동시에 벌이지 마세요."

{
  "primaryArea": "올해 가장 크게 움직이는 영역 (예: 일·진로 / 재물·수입 / 관계 / 건강·생활 / 변화)",
  "primaryReason": "그 영역이 핵심인 사주적 근거 (원국·대운·세운 기반, 1문장)",
  "coreDirection": "완결된 핵심 방향 1문장 — 안내문 금지",
  "pushSummary": "지금 해야 할 행동 1문장 — 동사로 시작, 안내문 금지",
  "avoidSummary": "지금 하지 말아야 할 행동 1문장 — pushSummary와 반대, 안내문 금지",
  "yearElementNote": "올해 세운 오행이 일간과 어떤 관계인지 핵심 작용 (1문장)",
  "daewoonNote": "현재 대운 간지와 상태. 전환 날짜 계산값 있으면 포함, 없으면 null",
  "relationshipPriority": "관계가 실제로 올해 1순위 영역인가? true 또는 false"
}

${yearNote}
${sewoonRef}
${prohibitNote}`;
    try {
      const coreRaw = await generateReading(ctx, corePrompt, systemPrompt, 600);
      const coreMatch = coreRaw.match(/\{[\s\S]*\}/);
      if (coreMatch) yearCore = JSON.parse(coreMatch[0]);
    } catch (e) {
      console.error('[saju-email][yearCore] parse failed:', e.message);
    }
  }

  /* yearCore에서 공통 컨텍스트 추출 */
  const coreCtx = yearCore
    ? `[이 리딩의 핵심 결론 — 모든 섹션이 이 방향을 따라야 합니다]
핵심 방향: ${yearCore.coreDirection}
1순위 영역: ${yearCore.primaryArea}
밀어야 할 것: ${yearCore.pushSummary}
피해야 할 것: ${yearCore.avoidSummary}
올해 세운 작용: ${yearCore.yearElementNote}
관계가 1순위인가: ${yearCore.relationshipPriority ? '예' : '아니오 — 관계 내용을 1순위로 만들지 마세요'}
${yearCore.daewoonNote ? `대운 상태: ${yearCore.daewoonNote}` : '대운 전환 날짜: 계산값 없음 — 날짜 추정 금지'}`
    : '';

  /* ══════════════════════════════════════════════════════════
     주제별 전용 프롬프트 빌더
  ══════════════════════════════════════════════════════════ */

  /* 섹션 1: 핵심 답변 — 4단락 명리 구조, 각 2~3문장 */
  function buildP1() {
    const conclusionLine = cat === 'year'
      ? `[결론 먼저] ${name}님의 ${yr}년 [${topicLabel}]에서 해야 할 것과 하지 말아야 할 것을 첫 문장에 직접 제시.`
      : cat === 'custom'
      ? `[결론 먼저] "${question}"에 대한 핵심 답변을 첫 문장에 직접 제시.`
      : `[결론 먼저] [${topicLabel}] 고민에서 지금 우선해야 할 방향을 첫 문장에 직접 제시. ${qNote}`;
    return `${conclusionLine}
${coreCtx}
${yearNote}
${relNote}

정확히 아래 4단락 구조로 작성하세요. 각 단락 2~3문장.

1단락 [결론]: 위 결론을 1~2문장. 안내문 금지, 사주적 근거 없이 결론만.
2단락 [원국 근거]: ${name}님 원국(일간·용신·주요 오행 구조)에서 [${topicLabel}]와 연결되는 강점·약점 2~3문장.
3단락 [대운·세운]: 현재 대운이 어떤 기운을 가져오는지 1~2문장. ${yr}년 ${sw} 세운이 추가로 어떻게 작용하는지 1~2문장. 대운·세운 혼동 금지.
4단락 [연결]: 이 흐름이 [${topicLabel}] 고민과 어떻게 이어지는지, 지금 어떤 태도가 맞는지 1~2문장.

해요체, 마크다운 금지. 각 단락 첫 문장은 실제 내용으로 시작 (안내문·소개문 금지).${completeNote}
${prohibitNote}`;
  }

  /* 섹션 2: 두 방향 비교 — 항목당 3줄, 오속의 판단 3문장 */
  function buildP2() {
    const abDef = cat === 'year'
      ? `A: 새로운 것을 넓히거나 변화를 추구하는 방향\nB: 기존 기반을 지키고 강화하는 방향`
      : cat === 'work' ? `A: 현재 분야·역할 유지\nB: 이직·전환·새로운 도전`
      : cat === 'business' ? `A: 지금 바로 시작·확장\nB: 더 준비 후 시작`
      : cat === 'love' || cat === 'marriage' ? `A: 현재 관계를 적극적으로 진전시키는 방향\nB: 지금은 내면을 먼저 정리하는 방향`
      : cat === 'money' ? `A: 새로운 수입 가능성을 소규모로 시험하는 방향\nB: 현재 여건을 점검하고 지키는 방향`
      : `${name}님의 [${topicLabel}] 고민에서 실질적으로 갈리는 두 방향`;
    return `${name}님의 [${topicLabel}] 고민에서 두 방향을 비교하세요.
방향 정의: ${abDef}
${yearNote}
${relNote}
${coreCtx}

정확히 아래 형식으로만 작성하세요:

[방향 A: (이름 한 단어~짧은 구)]
- 의미: 1문장
- 장점: 1문장
- 주의점: 1문장

[방향 B: (이름 한 단어~짧은 구)]
- 의미: 1문장
- 장점: 1문장
- 주의점: 1문장

[오속의 판단]
(더 적합한 방향, 그 이유, 지금 당장 할 첫 행동을 합쳐 2~3문장)

두 방향이 표현만 다른 같은 내용이면 다시 구성하세요. 해요체, 마크다운 금지.${completeNote}
${prohibitNote}`;
  }

  /* 섹션 3: 밀어야 할 방향 — 행동 2개 + 이유 1문장 */
  function buildP3() {
    const focus = cat === 'year'
      ? `[${yearCore?.primaryArea || '핵심 영역'}] 기준, ${name}님이 지금 실제로 해야 할 행동.`
      : `[${topicLabel}] 고민에서 ${name}님이 지금 해야 할 행동.`;
    return `${focus}
${coreCtx}
${yearNote}
${relNote}

정확히 아래 형식으로만 작성하세요:
- 핵심 행동 1: (동사로 시작하는 구체적 행동 1문장)
- 핵심 행동 2: (동사로 시작하는 구체적 행동 1문장)
- 이 방향이 맞는 이유: (사주 계산값 기반 1문장)

[금지] 피해야 할 것·주의사항을 여기에 쓰지 마세요. 원국·오행 개수 반복 금지. 직업·자산 가정 금지.
해요체, 마크다운 금지.${completeNote}
${prohibitNote}`;
  }

  /* 섹션 4: 피해야 할 선택 — 섹션3과 반드시 반대 내용 */
  function buildP4() {
    const focus = cat === 'year'
      ? `올해 에너지를 소진시키는 행동, ${name}님이 지금 하지 말아야 할 결정.`
      : `[${topicLabel}] 고민에서 ${name}님이 지금 피해야 할 선택.`;
    return `${focus}
${coreCtx}
${yearNote}
${relNote}

정확히 아래 형식으로만 작성하세요:
- 피할 행동 1: (구체적으로 하지 말아야 할 행동 1문장)
- 피할 행동 2: (구체적으로 하지 말아야 할 행동 1문장)
- 주의해야 하는 이유: (사주 계산값 기반 1문장)

[금지] 해야 할 행동을 여기에 쓰지 마세요. 밀어야 할 방향과 같은 내용 표현만 바꿔 반복 금지. 원국·오행 개수 반복 금지. 직업·자산 가정 금지. 두렵게 만들지 말고 실용적으로.
해요체, 마크다운 금지.${completeNote}
${prohibitNote}`;
  }

  /* 섹션 5: 연도별 흐름 JSON — 연도당 3항목 각 1문장 */
  const yr2 = yr + 1, yr3 = yr + 2;
  function buildP5() {
    const flowCtx = cat === 'year'
      ? `${coreCtx}\n각 연도는 일·재물·관계·건강·변화 중 서로 다른 영역 하나씩. 3연도 모두 관계 중심 금지. '정리→검증→확장' 패턴은 실제 계산이 뒷받침될 때만.`
      : `각 연도에서 [${topicLabel}] 관련 흐름을 서로 다른 각도로.`;
    return `${name}님의 ${yr}·${yr2}·${yr3}년 흐름을 아래 JSON으로만 출력하세요. 다른 텍스트 없이 JSON만:
[
  {"year":${yr},"sewoon":"${sw}","flow":"이 해의 역할 1~2문장","action":"밀어야 할 행동 1문장","caution":"주의할 선택 1문장"},
  {"year":${yr2},"sewoon":"정미(丁未)","flow":"...","action":"...","caution":"..."},
  {"year":${yr3},"sewoon":"무신(戊申)","flow":"...","action":"...","caution":"..."}
]
${yearNote}
${sewoonRef}
${flowCtx}
규칙: sewoon 필드에는 세운 간지만. 대운 간지 금지. 원국·일간·오행 개수 반복 금지. 각 항목 완결 문장.
${prohibitNote}`;
  }

  /* 섹션 6: 30일 체크리스트 — 주차당 목표1+행동2 구조만 */
  function buildP6() {
    const planFocus = cat === 'year'
      ? `[${yearCore?.primaryArea || '핵심 영역'}] 기준 행동으로 구성. 관계가 1순위가 아니면 배우자 중심 행동 금지.`
      : `[${topicLabel}] 분야 실행 계획.`;
    return `${name}님의 앞으로 30일 행동 계획.
${dateNote}
${planFocus}

정확히 아래 형식으로만 작성하세요. 명리 해설·추가 설명 없이 이 구조만:

1주차
목표: (한 문장)
□ 행동 1
□ 행동 2

2주차
목표: (한 문장)
□ 행동 1
□ 행동 2

3주차
목표: (한 문장)
□ 행동 1
□ 행동 2

4주차
목표: (한 문장)
□ 행동 1
□ 행동 2

30일 후 확인할 변화: (다음 결정을 내리기 위해 확인할 기준 1문장)

행동은 실제 수행 가능한 구체적 문장으로. 직업·자산·투자 가정 금지. 주차 내 명리 근거 반복 금지.
해요체, 마크다운 금지.${completeNote}
${prohibitNote}`;
  }

  /* 섹션 7: 매력살·귀인 — 3항목 구조, 최대 2단락 */
  function buildP7() {
    return `${name}님 사주에서 실제 성립하는 매력살·귀인을 확인하고 [${topicLabel}]와 연결하세요.
[확인 대상]: 도화살, 화개살, 홍염살, 천을귀인, 천덕귀인, 월덕귀인, 문창귀인, 학당귀인, 태극귀인
${yearNote}

성립 시 다음 구조로 작성:
- 확인된 강점/신살: (명칭과 어느 기둥에서 성립하는지)
- 성립 근거: (1문장)
- [${topicLabel}] 활용 방법: (${yr}년 기준 1문장)

없으면: "이번 계산 기준에서 대표 매력살은 확인되지 않았습니다." 후 아래 구조로:
- 확인된 강점: (원국의 실제 강점)
- 성립 근거: (1문장)
- [${topicLabel}] 활용 방법: (1문장)

첫 줄: 신살 있으면 "나의 매력살·귀인 에너지", 없으면 "올해 활용할 나의 강점".
일반 성격 칭찬·앞 섹션 오행 반복 금지. 계산되지 않은 신살 생성 금지.
최대 2단락. 해요체, 마크다운 금지.${completeNote}
${prohibitNote}`;
  }

  /* ══════════════════════════════════════════════════════════
     섹션 생성 실행
  ══════════════════════════════════════════════════════════ */

  /* 1. 핵심 답변 */
  const r1 = await generateWithRetry(ctx, buildP1(), systemPrompt, 2500, c => validateContent(c, '핵심답변'));
  if (r1.ok) {
    sections.push({ icon: '💬', label: `${topicLabel} — 핵심 답변`, content: r1.content });
  } else {
    failedSections.push({ name: '핵심 답변', reason: r1.reason });
    sections.push({ icon: '💬', label: `${topicLabel} — 핵심 답변`, content: r1.content || '(생성 오류)' });
  }

  /* 2. 선택지 비교 */
  const r2 = await generateWithRetry(ctx, buildP2(), systemPrompt, 2500, c => validateContent(c, '선택지비교'));
  if (r2.ok) {
    sections.push({ icon: '⚖️', label: '지금 가능한 두 방향', content: r2.content, focusType: 'choices' });
  } else {
    failedSections.push({ name: '선택지 비교', reason: r2.reason });
    sections.push({ icon: '⚖️', label: '지금 가능한 두 방향', content: r2.content || '(생성 오류)', focusType: 'choices' });
  }

  /* 3. 밀어야 할 방향 */
  const r3 = await generateWithRetry(ctx, buildP3(), systemPrompt, 2000, c => validateContent(c, '밀어야할방향'));
  if (r3.ok) {
    sections.push({ icon: '🟢', label: '지금 밀어야 할 방향', content: r3.content, focusType: 'push' });
  } else {
    failedSections.push({ name: '밀어야 할 방향', reason: r3.reason });
    sections.push({ icon: '🟢', label: '지금 밀어야 할 방향', content: r3.content || '(생성 오류)', focusType: 'push' });
  }

  /* 4. 피해야 할 선택 */
  const r4 = await generateWithRetry(ctx, buildP4(), systemPrompt, 2000, c => validateContent(c, '피해야할선택'));
  if (r4.ok) {
    sections.push({ icon: '🔴', label: '지금 피해야 할 선택', content: r4.content, focusType: 'avoid' });
  } else {
    failedSections.push({ name: '피해야 할 선택', reason: r4.reason });
    sections.push({ icon: '🔴', label: '지금 피해야 할 선택', content: r4.content || '(생성 오류)', focusType: 'avoid' });
  }

  /* 5. 연도별 흐름 (JSON) */
  const validateYearFlows = (c) => {
    const parsed = parseYearFlowsJson(c);
    if (!parsed || parsed.length < 3) return { ok: false, reason: 'yearflows:parse_failed' };
    for (const row of parsed) {
      for (const key of ['flow', 'action', 'caution']) {
        const v = validateContent(row[key] || '', `yearflows.${key}`);
        if (!v.ok) return v;
      }
    }
    return { ok: true };
  };
  const r5 = await generateWithRetry(ctx, buildP5(), systemPrompt, 1500, validateYearFlows);
  if (r5.ok) {
    sections.push({ icon: '📅', label: `${yr}~${yr3} 연도별 흐름`, content: r5.content, isFocusTimeline: true });
  } else {
    failedSections.push({ name: '연도별 흐름', reason: r5.reason });
    sections.push({ icon: '📅', label: `${yr}~${yr3} 연도별 흐름`, content: r5.content || '(생성 오류)', isFocusTimeline: true });
  }

  /* 6. 30일 행동 계획 */
  const r6 = await generateWithRetry(ctx, buildP6(), systemPrompt, 2500, validate30DayPlan);
  if (r6.ok) {
    sections.push({ icon: '🗓️', label: '앞으로 30일 행동 순서', content: r6.content, is30DayPlan: true });
  } else {
    failedSections.push({ name: '30일 행동 순서', reason: r6.reason });
    sections.push({ icon: '🗓️', label: '앞으로 30일 행동 순서', content: r6.content || '(생성 오류)', is30DayPlan: true });
  }

  /* 7. 매력살·귀인 */
  const r7 = await generateWithRetry(ctx, buildP7(), systemPrompt, 1800, c => validateContent(c, '매력살귀인'));
  const shinsal7Label = (r7.content || '').includes('올해 활용할') ? '올해 활용할 나의 강점' : '나의 매력살·귀인 에너지';
  if (r7.ok) {
    sections.push({ icon: '✨', label: shinsal7Label, content: r7.content });
  } else {
    failedSections.push({ name: '매력살·귀인', reason: r7.reason });
    sections.push({ icon: '✨', label: shinsal7Label, content: r7.content || '(생성 오류)' });
  }

  /* 8. 마무리 메시지 (별도 생성 + 검증) */
  const validateClosing = (c) => {
    const v = validateContent(c, 'closing');
    if (!v.ok) return v;
    if (c.trim().length < 80) return { ok: false, reason: `closing:too_short(${c.trim().length})` };
    return { ok: true };
  };
  const closingPrompt = `${name}님의 [${topicLabel}] 집중 리딩을 마무리하는 따뜻한 메시지를 작성해주세요.
${yearNote}

조건:
- 이번 리딩의 핵심 결론을 한 문장으로 요약
- ${name}님이 이 고민을 잘 헤쳐나갈 수 있다는 따뜻하고 구체적인 응원 2~3문장
- 새로운 분석을 추가하지 말고 이미 나온 결과를 기반으로
- 마지막 문장은 반드시 완결된 문장으로 끝내세요
- 80~200자 내외. 반드시 해요체.${completeNote}`;
  const r8 = await generateWithRetry(ctx, closingPrompt, systemPrompt, 600, validateClosing);
  const closingMessage = r8.ok ? r8.content.trim() : null;
  if (!r8.ok) {
    failedSections.push({ name: '마무리 메시지', reason: r8.reason });
  }

  /* 9. 요약 카드 생성 — 말줄임표 없이 첫 완결 문장 추출 */
  const extractFirstSentence = (text = '') => {
    const t = text.trim();
    /* 종결어미(요·다·죠·니까) 뒤 공백 기준 첫 문장 */
    const m = t.match(/^[\s\S]{15,}?[요다죠까]\s/);
    if (m) return m[0].trim();
    /* 줄바꿈 기준 첫 줄 */
    const line = t.split('\n').find(l => l.trim().length > 10);
    return line ? line.trim() : t.slice(0, 120);
  };

  /* 30일 계획에서 1주차 첫 행동 추출 */
  const planContent6 = r6.content || '';
  const firstActionMatch = planContent6.match(/□\s*([^\n]+)/);
  const firstAction = firstActionMatch ? firstActionMatch[1].trim() : '';

  /* 안내문 감지 — 이런 패턴이면 summaryCard 필드로 사용 불가 */
  const INTRO_PATTERNS = [
    /분석한\s*결과/, /지침입니다/, /살펴보겠습니다/, /정리해드릴/, /확인해보세요/,
    /도움이 되는/, /흐름을 안내/, /아래에서/, /설명하겠습니다/, /안내해드릴/,
    /참고하세요/, /다음과 같/, /이번 리딩/, /리딩을 시작/, /리딩입니다/,
  ];
  const isIntro = (s = '') => INTRO_PATTERNS.some(p => p.test(s));

  /* 안내문이면 본문에서 재추출 */
  const safeField = (candidate, fallbackContent) => {
    if (!candidate || isIntro(candidate)) return extractFirstSentence(fallbackContent);
    return candidate;
  };

  let summaryCard = null;
  if (yearCore) {
    summaryCard = {
      핵심결론: safeField(yearCore.coreDirection, r1.content),
      밀어야할방향: safeField(yearCore.pushSummary, r3.content),
      피해야할선택: safeField(yearCore.avoidSummary, r4.content),
      첫행동: firstAction,
    };
  } else {
    summaryCard = {
      핵심결론: safeField(extractFirstSentence(r1.content), r1.content),
      밀어야할방향: safeField(extractFirstSentence(r3.content), r3.content),
      피해야할선택: safeField(extractFirstSentence(r4.content), r4.content),
      첫행동: firstAction,
    };
  }
  /* 최종 검증 로그 */
  const badFields = Object.entries(summaryCard).filter(([k,v]) => isIntro(v)).map(([k]) => k);
  if (badFields.length > 0) {
    console.warn(`[saju-email][summaryCard] 안내문 감지 필드: ${badFields.join(', ')}`);
  }

  /* ── 임계 섹션 실패 시 이메일 차단 ── */
  const criticalFailed = failedSections.filter(f =>
    ['핵심 답변', '30일 행동 순서', '마무리 메시지'].includes(f.name)
  );
  if (criticalFailed.length > 0) {
    const details = criticalFailed.map(f => `${f.name}(${f.reason})`).join(', ');
    throw new Error(`generation_incomplete: ${details}`);
  }

  return { sections, closingMessage, summaryCard };
}

/* ─────────────────────────────────────────────────────────────
   프리미엄 전용: 매력살·귀인운 상세 섹션
───────────────────────────────────────────────────────────── */
async function buildPremiumAttractionSection(sajuData, ctx, name, currentYear, systemPrompt) {
  const shinsal    = sajuData.shinsal    || {};
  const auspicious = sajuData.auspicious || {};

  const SHINSAL_INFO = {
    dohwa:    '도화살(桃花)',
    hwagae:   '화개살(華蓋)',
    hongyeom: '홍염살(紅艷)',
  };
  const confirmedShinsal = Object.entries(SHINSAL_INFO)
    .filter(([key]) => shinsal[key]?.present)
    .map(([key, label]) => `${label}(${(shinsal[key].matchedPositions || []).join('·')} 기둥 성립)`);

  const GWININ_LABELS = {
    cheoneul: '천을귀인', cheondeok: '천덕귀인', woldeok: '월덕귀인',
    munchang: '문창귀인', taegeuk:  '태극귀인',
  };
  const presentIds     = auspicious.presentItems || [];
  const confirmedGwinin = presentIds.map(id => GWININ_LABELS[id]).filter(Boolean);

  const shinsalLine = confirmedShinsal.length > 0
    ? `확인된 매력살: ${confirmedShinsal.join(', ')}`
    : '확인된 매력살: 도화·홍염·화개 모두 불성립';
  const gwininLine  = confirmedGwinin.length > 0
    ? `확인된 귀인·길신: ${confirmedGwinin.join(', ')}`
    : '확인된 귀인·길신: 없음';

  const prompt = `${name}님의 실제 명리 계산 결과입니다.

${shinsalLine}
${gwininLine}
분석 기준: ${currentYear}년

위 확인된 신살·귀인만을 바탕으로 아래 4항목을 작성해주세요. 계산에 없는 신살을 추가하거나 임의로 생성하지 마세요.

💗 나의 매력 유형
확인된 매력살 기반으로 ${name}님만의 매력 유형을 2~3문장으로. 성립된 살이 없으면 일간의 에너지에서 드러나는 자연스러운 매력을 써주세요.

✨ 매력이 빛나는 곳
이 매력이 실제로 드러나는 상황·환경을 2~3문장. ${currentYear}년 세운 흐름을 반영하세요.

🤝 나의 귀인 유형
확인된 귀인·길신 기반으로 어떤 사람이나 상황이 도움이 되는지 2~3문장. 귀인이 없으면 일간과 원국에서 자연스럽게 인연이 형성되는 방식을 써주세요.

🔑 귀인운을 여는 행동
${currentYear}년에 실제로 할 수 있는 구체적 행동 2~3가지. 계산 근거를 자연스럽게 언급하세요.

각 항목 제목(💗 나의 매력 유형, ✨ 매력이 빛나는 곳, 🤝 나의 귀인 유형, 🔑 귀인운을 여는 행동)은 그대로 유지하세요. 해요체, 마크다운 금지. 계산되지 않은 신살 생성 금지.`;

  const content = await generateReading(ctx, prompt, systemPrompt, 1800);
  return { icon: '✨', label: '나의 특별한 기운 — 매력살 & 귀인운', content };
}

/* ─────────────────────────────────────────────────────────────
   이메일 발송 핵심 로직
───────────────────────────────────────────────────────────── */
async function sendSajuEmail(email, sajuData, isPremium) {
  /* ── 티어 확정 ── */
  const tier = sajuData.tier || (isPremium ? 'premium' : 'basic');

  /* ── 입력 검증 ── */
  const validationErrors = validateSajuInput(sajuData, tier);
  if (validationErrors.length > 0) {
    console.error(`[saju-email][blocked] email=${email} tier=${tier} errors=${JSON.stringify(validationErrors)}`);
    throw new Error(`validation_failed: ${validationErrors.join(', ')}`);
  }

  /* ── 현재 연도·세운 ── */
  const { year: currentYear, sewoon: currentSewoon } = extractYearInfo(sajuData);

  /* ── 시스템 프롬프트 ── */
  const systemPrompt = buildSystemPrompt(currentYear, currentSewoon);

  /* ── 이름 & 표시 정보 ── */
  const name     = sajuData.name || '내담자';
  const calType  = sajuData.calendarType === 'lunar' ? '음력' : '양력';
  const hourDisplay = sajuData.hourVal >= 0
    ? (sajuData.hourLabel || '')
    : '출생시간 모름';
  const genderKo = sajuData.gender === 'm' ? '남성' : '여성';
  const infoLine = `${sajuData.year}년 ${sajuData.month}월 ${sajuData.day}일 · ${hourDisplay} · ${calType} · ${genderKo}`;

  const ctx      = sajuData.context;
  const sections = [];

  /* ── 티어 라우팅 ── */
  if (tier === 'single') {
    /* 4,900원 — 내 질문 하나 집중 리딩 */
    const topicLabel = sajuData.concern?.label || FOCUS_TOPIC_MAP[sajuData.concern?.category] || '선택한 고민';
    const basisLine  = `결과 기준 · ${currentYear}년 ${currentSewoon || ''} 세운`;

    const { sections: focusSections, closingMessage, summaryCard } = await generateFocusReading(
      sajuData, ctx, name, currentYear, currentSewoon, systemPrompt
    );
    sections.push(...focusSections);

    const html = buildEmailHtml(
      name,
      { infoLine, topicLine: `선택한 고민 · ${topicLabel}`, basisLine },
      sections,
      closingMessage || '',
      '내 질문 하나 집중 리딩',
      summaryCard || null
    );

    // Resend 발송
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: [email],
        subject: `${name}님의 [${topicLabel}] 집중 리딩이 도착했어요 ✦`,
        html,
      }),
    });
    if (!emailRes.ok) {
      const err = await emailRes.json();
      throw new Error(JSON.stringify(err));
    }
    // saju_pending 데이터는 삭제하지 않음 (관리자 재발송 검수용, 24시간 후 자동 만료)
    await notifyAdmin(
      `[오속 사주] ✅ 발송 완료 — ${name}님`,
      `리딩 이메일 발송 완료!\n\n고객: ${name}님\n이메일: ${email}\n상품: 내 질문 하나 집중 리딩 (4,900원)\n고민: ${sajuData.concern?.label || '-'}`
    );
    return;
  }

  /* basic / premium — 종합 리딩 */
  const relStatus = sajuData.relationStatus || 'private';
  const loveCfg   = REL_LOVE_CONFIG[relStatus] || REL_LOVE_CONFIG.private;

  /* 프리미엄 전용 사전 섹션 (순서: focus 리딩 → 매력살·귀인운 → 기존 종합 리딩) */
  let premiumFocusSections   = [];
  let premiumFocusSummaryCard = null;
  let premiumAttractionSection = null;

  if (tier === 'premium') {
    try {
      const { sections: fSecs, summaryCard: fCard } = await generateFocusReading(
        sajuData, ctx, name, currentYear, currentSewoon, systemPrompt
      );
      premiumFocusSections   = fSecs;
      premiumFocusSummaryCard = fCard;
    } catch (e) {
      console.error('[saju-email][premium-focus]', e.message);
    }
    try {
      premiumAttractionSection = await buildPremiumAttractionSection(
        sajuData, ctx, name, currentYear, systemPrompt
      );
    } catch (e) {
      console.error('[saju-email][premium-attraction]', e.message);
    }
  }

  /* 1. 질문 맞춤 답변 (basic만 — premium은 focus 리딩이 대신) */
  if ((sajuData.customQuestion || sajuData.concern?.question) && tier !== 'premium') {
    const q = sajuData.customQuestion || sajuData.concern.question;
    const questionTopic = sajuData.questionTopic || sajuData.concern?.label || '';
    const qPrompt = `${name}님의 질문: ${q}

${questionTopic ? `[${questionTopic}] 영역 중심으로 ` : ''}사주팔자를 바탕으로 깊이 있고 구체적인 답변을 작성해주세요.
먼저 이 질문과 관련된 사주 영역을 짚고, ${currentYear}년 흐름에서 어떤 방향성이 보이는지, 구체적인 시기가 있다면 명확하게, 지금 당장 실천할 수 있는 행동 방향 1~2가지로 마무리해주세요.
4~5단락. 반드시 해요체, 마크다운 금지.`;
    const content = await generateReading(ctx, qPrompt, systemPrompt, 2200);
    sections.push({ icon: '💬', label: `${questionTopic ? questionTopic + ' — ' : ''}${name}님의 질문 맞춤 풀이`, content });
  }

  /* 2. 기본 카테고리 */
  for (const cat of CATEGORY_PROMPTS) {
    let prompt = cat.prompt;
    let label  = cat.label;

    if (cat.key === 'love') {
      label  = loveCfg.label;
      prompt = `${loveCfg.interp}

${name}님의 사주에서 관계·인연 영역을 깊이 분석해주세요.
분석 초점: ${loveCfg.focus}

핵심 결론, 사주 근거, ${currentYear}년 관계 에너지와 중요한 흐름, 주의할 패턴, 지금 당장 실천할 방향.
4~6단락. 반드시 해요체, 마크다운 금지.`;
    }

    const maxTk = cat.key === 'health' ? 1900 : 2400;
    const content = await generateReading(ctx, prompt, systemPrompt, maxTk);
    sections.push({ icon: cat.icon, label, content });
  }

  /* 3. 시기 요약표 */
  const now2       = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const startYear  = now2.getFullYear();
  const startMonth = now2.getMonth() + 1;
  const timelinePrompt = `${name}님의 ${startYear}년 ${currentSewoon} 세운 에너지를 월별로 정리해주세요.

규칙: 월별 세운(월주 간지) 데이터는 제공되지 않았어요. 임의로 계산하거나 꾸며내지 마세요. 대신 ${startYear}년 ${currentSewoon} 세운이 원국 일간과 어떻게 작용하는지를 기준으로 상반기·하반기 흐름 차이를 반영해 12개월을 분류하세요. 에너지는 기회/안정/전환/주의 중 하나만.

각 달 형식: YYYY년 MM월 | 에너지 | 한 줄 설명

${startYear}년 ${startMonth}월부터 12개월 전부. 다른 텍스트 없이 표 형식만.`;
  const timelineRaw = await generateReading(ctx, timelinePrompt, systemPrompt, 1600);
  sections.push({ icon: '📅', label: `${startYear} 핵심 시기 요약`, content: timelineRaw, isTimeline: true });

  /* 4. 지금부터 준비해야 할 것 */
  const actionPrompt = `${name}님의 사주팔자와 ${currentYear}년 운의 흐름을 바탕으로 "지금부터 준비해야 할 것"을 작성해주세요.
${name}님의 기질과 ${currentYear}년 대운·세운 에너지에 맞는 구체적 준비 방향을 담아주세요. 재물·관계·일·내면 등 중요한 영역에서 지금 당장 시작할 수 있는 것과 올해 안에 준비해야 할 것을 나눠서.
5~6단락. 반드시 해요체, 마크다운 금지.`;
  const actionContent = await generateReading(ctx, actionPrompt, systemPrompt, 2400);
  sections.push({ icon: '🚀', label: '지금부터 준비해야 할 것', content: actionContent });

  /* 5. 프리미엄 전용 */
  if (tier === 'premium') {
    for (const cat of PREMIUM_PROMPTS) {
      const content = await generateReading(ctx, cat.prompt, systemPrompt, 2200);
      sections.push({ icon: cat.icon, label: cat.label, content });
    }
  }

  /* 6. 마무리 메시지 */
  const closingPrompt = `${name}님의 사주 리딩을 마무리하는 따뜻한 메시지를 3~4문장으로 작성해주세요. 이 사람의 기질과 ${currentYear}년 에너지를 담아 개인화되게. 반드시 해요체, 마크다운 금지.`;
  const closingMsg = await generateReading(ctx, closingPrompt, systemPrompt, 800);

  const finalSections = tier === 'premium'
    ? [
        ...premiumFocusSections,
        ...(premiumAttractionSection ? [premiumAttractionSection] : []),
        ...sections,
      ]
    : sections;
  const productLabel = tier === 'premium' ? '★ 프리미엄 종합 풀이' : null;
  const html = buildEmailHtml(
    name,
    { infoLine, topicLine: null, basisLine: null },
    finalSections,
    closingMsg,
    productLabel,
    tier === 'premium' ? premiumFocusSummaryCard : null
  );

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: [email],
      subject: `${name}님의 오속 사주 ${tier === 'premium' ? '프리미엄 종합' : '상세'} 리딩이 도착했어요 ✦`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json();
    throw new Error(JSON.stringify(err));
  }

  // saju_pending 데이터는 삭제하지 않음 (관리자 재발송 검수용, 24시간 후 자동 만료)
  await notifyAdmin(
    `[오속 사주] ✅ 발송 완료 — ${name}님`,
    `리딩 이메일 발송 완료!\n\n고객: ${name}님\n이메일: ${email}\n상품: ${tier === 'premium' ? '프리미엄 종합 풀이 (14,900원)' : '기본 리딩'}`
  );
}

/* ─────────────────────────────────────────────────────────────
   핸들러
───────────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  // 관리자 재발송 (GET)
  if (req.method === 'GET') {
    const { secret, email, tier } = req.query;
    if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
    if (!email) return res.status(400).json({ error: 'email required' });
    const sajuData = await redis.get(`saju_pending:${email.toLowerCase().trim()}`);
    if (!sajuData) return res.status(200).json({ found: false, message: `${email} 데이터 없음 (만료됐거나 저장 안 됨)` });
    if (tier) sajuData.tier = tier; // 티어 강제 지정 가능
    const isPremium = (sajuData.tier || 'basic') === 'premium';
    try {
      await sendSajuEmail(email.toLowerCase().trim(), sajuData, isPremium);
      return res.status(200).json({ found: true, sent: true, name: sajuData.name, message: `${sajuData.name}님(${email}) 이메일 발송 완료` });
    } catch (e) {
      return res.status(500).json({ found: true, sent: false, error: e.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  let { email, sajuData, isPremium } = req.body;
  if (!email) return res.status(400).json({ error: 'missing email' });

  // sajuData가 없으면 Redis에서 조회 (클라이언트 트리거 방식)
  if (!sajuData) {
    sajuData = await redis.get(`saju_pending:${email.toLowerCase().trim()}`);
    if (!sajuData) return res.status(404).json({ error: 'saju_data_not_found' });
    isPremium = (sajuData.tier || 'basic') === 'premium';
  }

  try {
    await sendSajuEmail(email, sajuData, isPremium);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`[saju-email][error] email=${email} error=${e.message}`);
    await notifyAdmin(
      `[오속 사주] ❌ 발송 실패 — ${email}`,
      `이메일 발송에 실패했어요!\n\n고객 이메일: ${email}\n상품: ${sajuData.tier || 'basic'}\n이름: ${sajuData.name || '미확인'}\n오류: ${e.message}\n\n수동 재발송:\nhttps://www.osok.kr/api/saju-email?secret=osok2026&email=${encodeURIComponent(email)}`
    );
    return res.status(500).json({ error: e.message });
  }
}

/* ── 내부 함수 테스트용 named export (saju-test.js 전용) ── */
export { generateFocusReading, buildEmailHtml, buildSystemPrompt };
