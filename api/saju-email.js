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
    ? `분석 기준: ${currentYear}년 ${currentSewoon} 세운. 이 세운·연도만 "올해" 또는 "현재"로 사용하세요. 2025년·을사를 절대 현재로 표현하지 마세요.`
    : `분석 기준: ${currentYear}년. 이 연도만 "올해"로 사용하세요. 2025년·을사를 절대 현재로 표현하지 마세요.`;

  return `당신은 사주명리학, 자미두수, 서양 점성술을 아우르는 동서양 명리 전문 상담사예요.
결제 고객에게 이메일로 전달될 사주 상세 리딩을 작성해주세요.

${yearLine}

핵심 철학:
- 운명을 예언하는 게 아니라, 타고난 에너지로 지금 어떻게 살아야 하는지 방향을 제시해요
- "좋다/나쁘다"보다 "지금 이 시기에 당신이 해야 할 것"을 중심으로 이야기해요
- 과거 기질 분석 + 현재 흐름 + 앞으로의 행동 방향을 하나의 스토리로 연결해요
- 사용자의 불안감을 과도하게 자극하거나 불행을 단정하지 않아요
- 내담자 정보에 관계 상태가 명시된 경우 반드시 해당 상태에 맞게 관계운을 해석해요
- 기혼자에게 배우자 외 이성 인연·불륜·이혼을 암시하거나 단정하지 않아요

규칙:
- 반드시 해요체 사용
- 내담자의 이름·생년월일·사주팔자를 직접 언급하며 완전히 개인화된 리딩
- 사주팔자(일간의 오행 성질, 오행 분포)를 핵심 축으로 해석
- 구체적인 행동 조언과 방향을 반드시 포함할 것
- 마크다운 기호(**굵게**, *기울임*, # 제목) 사용 금지
- 번호 목록이나 불릿 기호 사용 금지
- 순수한 텍스트만 사용할 것`;
}

/* ─────────────────────────────────────────────────────────────
   AI 호출
───────────────────────────────────────────────────────────── */
async function generateReading(sajuContext, prompt, systemPrompt, maxTokens = 1400) {
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
const SENTENCE_ENDINGS = ['요', '다', '죠', '세요', '하세요', '됩니다', '입니다', '.', '!', '?', '~'];
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
  if (!rows) {
    return `<div style="color:#b89e7e;font-size:15px;line-height:2;white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word">${raw}</div>`;
  }
  return rows.map(r => `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(201,168,76,0.18);border-radius:12px;padding:18px 20px;margin-bottom:16px;word-break:keep-all;overflow-wrap:break-word">
      <p style="color:#c9a84c;font-size:15px;font-weight:700;margin:0 0 12px">${escHtml(String(r.year))}년 · ${escHtml(r.sewoon || '')}</p>
      <p style="color:#b89e7e;font-size:13px;margin:0 0 6px;font-weight:600">이 고민에서의 역할</p>
      <p style="color:#ede0c8;font-size:14px;line-height:1.75;margin:0 0 10px">${escHtml(r.flow || '')}</p>
      <p style="color:#8ecfc0;font-size:13px;margin:0 0 4px;font-weight:600">밀어야 할 행동</p>
      <p style="color:#ede0c8;font-size:14px;line-height:1.75;margin:0 0 10px">${escHtml(r.action || '')}</p>
      <p style="color:#e8a060;font-size:13px;margin:0 0 4px;font-weight:600">주의할 선택</p>
      <p style="color:#ede0c8;font-size:14px;line-height:1.75;margin:0">${escHtml(r.caution || '')}</p>
    </div>`).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────────────────────────
   이메일 HTML 빌더
───────────────────────────────────────────────────────────── */
function buildEmailHtml(name, headerMeta, sections, closingMsg, productLabel) {
  const sectionsHtml = sections.map(({ icon, label, content, isTimeline, isFocusTimeline, focusType }) => {
    let bodyHtml;
    if (isTimeline) {
      bodyHtml = renderTimelineHtml(content);
    } else if (isFocusTimeline) {
      bodyHtml = renderFocusYearCards(content);
    } else {
      bodyHtml = `<div style="color:#ede0c8;font-size:15px;line-height:2;white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word">${content}</div>`;
    }

    // 밀어야 할 방향 / 피해야 할 선택 — 색상 카드
    let cardStyle = 'background:#10102a;border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px 24px;margin-bottom:40px';
    if (focusType === 'push') {
      cardStyle = 'background:rgba(80,180,160,0.06);border:1px solid rgba(80,180,160,0.3);border-radius:12px;padding:20px 24px;margin-bottom:40px';
    } else if (focusType === 'avoid') {
      cardStyle = 'background:rgba(220,100,60,0.06);border:1px solid rgba(220,100,60,0.3);border-radius:12px;padding:20px 24px;margin-bottom:40px';
    } else if (focusType === 'choices') {
      cardStyle = 'background:rgba(160,143,208,0.06);border:1px solid rgba(160,143,208,0.25);border-radius:12px;padding:20px 24px;margin-bottom:40px';
    }

    const labelColor = focusType === 'push' ? '#8ecfc0' : focusType === 'avoid' ? '#e8a060' : focusType === 'choices' ? '#a48fd0' : '#c9a84c';

    return `
    <div style="${cardStyle}">
      <h2 style="color:${labelColor};font-size:17px;font-weight:700;border-bottom:1px solid ${labelColor}30;padding-bottom:10px;margin:0 0 16px">${icon} ${label}</h2>
      ${bodyHtml}
    </div>`;
  }).join('');

  const closingHtml = `
    <div style="margin-top:8px;padding:24px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.18);border-radius:12px;text-align:center">
      <p style="color:#c9a84c;font-size:13px;letter-spacing:.12em;margin:0 0 10px">✦ 오속의 마무리 메시지 ✦</p>
      <p style="color:#ede0c8;font-size:15px;line-height:1.9;margin:0">${closingMsg}</p>
    </div>`;

  // headerMeta: { infoLine, topicLine, basisLine }
  const headerExtra = headerMeta.topicLine
    ? `<p style="color:#c9a84c;font-size:13px;margin:6px 0 2px;font-weight:600">${headerMeta.topicLine}</p>
       <p style="color:#b89e7e;font-size:12px;margin:0">${headerMeta.basisLine}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}님의 오속 사주 리딩</title>
</head>
<body style="background:#06060f;margin:0;padding:0;font-family:Georgia,'Noto Serif KR',serif">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px">

    <div style="text-align:center;margin-bottom:40px">
      <p style="color:#c9a84c;font-size:11px;letter-spacing:4px;margin:0 0 8px">✦ 오속 사주 ✦</p>
      ${productLabel ? `<p style="color:#a48fd0;font-size:12px;letter-spacing:2px;margin:0 0 12px">${productLabel}</p>` : ''}
      <h1 style="color:#ede0c8;font-size:22px;line-height:1.6;margin:0 0 10px;font-weight:700">${name}님의 사주 리딩이<br>도착했어요</h1>
      <p style="color:#b89e7e;font-size:13px;margin:0 0 4px">${headerMeta.infoLine}</p>
      ${headerExtra}
      <p style="color:rgba(184,158,126,0.5);font-size:11px;margin:8px 0 0">본 리딩은 오속 사주 AI 기반 분석이에요 · 오락 및 참고 목적</p>
    </div>

    <div style="background:#10102a;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:32px 28px">
      ${sectionsHtml}
      ${closingHtml}
    </div>

    <div style="text-align:center;color:rgba(184,158,126,0.5);font-size:12px;line-height:2;margin-top:32px;padding-top:24px;border-top:1px solid rgba(201,168,76,0.08)">
      <p style="margin:0">오속 사주 · www.osok.kr/saju.html</p>
      <p style="margin:0">궁금한 점은 <a href="http://pf.kakao.com/_bSudX/chat" style="color:#c9a84c">카카오 채널</a>로 문의해주세요</p>
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

  /* ══════════════════════════════════════════════════════════
     주제별 전용 프롬프트 빌더
  ══════════════════════════════════════════════════════════ */

  /* 섹션 1: 핵심 답변 프롬프트 */
  function buildP1() {
    if (cat === 'year') {
      return `${name}님의 사주와 ${yr}년 ${sw} 흐름을 분석해서 '올해의 흐름' 핵심 결론을 알려주세요.
${yearNote}
${relNote}

[필수 포함 내용 — 아래 순서로 작성하세요]
1단락: 올해 ${name}님에게 가장 크게 움직이는 영역이 무엇인지, 왜 그 영역인지 한두 문장으로 시작하세요.
2단락: 일·재물·관계·건강·생활변화 중 ${yr}년 실제 계산 결과에 따른 우선순위를 간결하게 알려주세요. 기혼이라는 이유만으로 관계를 1순위로 만들지 마세요.
3단락: 올해 확장하거나 밀어야 할 영역과, 서두르지 말아야 할 영역을 한 문장씩.
4단락: 현재 대운과 ${yr}년 ${sw}가 어떻게 연결되는지 한두 문장.

총 4단락. 반드시 해요체, 마크다운 금지.${completeNote}`;
    }
    if (cat === 'custom') {
      return `${name}님의 직접 질문: "${question}"
${yearNote}
${relNote}

1단락: 이 질문에 대한 핵심 답변을 명확하고 직접적인 한 문장으로 시작하세요.
2~3단락: ${name}님의 사주 기질과 ${yr}년 ${sw}에서 이 질문과 관련된 흐름을 구체적으로 찾아주세요.

총 3~4단락. 반드시 해요체, 마크다운 금지.${completeNote}`;
    }
    /* work / money / business / love / marriage / family */
    return `${name}님의 선택 고민: [${topicLabel}]
${qNote}
${yearNote}
${relNote}

1단락: [${topicLabel}]에 대한 핵심 답변을 강렬하고 명확한 한 문장으로 시작하세요.
2~3단락: 지금 이 고민이 답답한 이유를 ${name}님의 사주 기질과 ${yr}년 ${sw} 흐름에서 구체적으로 찾아주세요.

총 3~4단락. 반드시 해요체, 마크다운 금지.${completeNote}`;
  }

  /* 섹션 2: 선택지 비교 프롬프트 */
  function buildP2() {
    if (cat === 'year') {
      return `${name}님의 ${yr}년 흐름에서 실제로 선택해야 하는 두 가지 방향을 비교해주세요.
${yearNote}
${relNote}

[선택지 A: 새로운 것을 넓히는 방향]
- ${name}님 사주에서 이 방향의 유리한 점
- 이 방향을 선택할 때의 위험

[선택지 B: 기존 기반을 정비하고 강화하는 방향]
- ${name}님 사주에서 이 방향의 유리한 점
- 이 방향을 선택할 때의 위험

[현재 더 유리한 방향]: ${yr}년 ${sw} 에너지에서 어느 쪽이 더 맞는지 한 문장.
[그 방향을 선택할 조건]: 실제 ${name}님 상황에서 이 방향이 맞는 전제 조건 한 문장.

4~5단락. 반드시 해요체, 마크다운 금지. 사용자에게 추가 정보를 요구하지 마세요.${completeNote}`;
    }
    if (cat === 'work') {
      return `${name}님의 [일·이직] 고민에서 실제 선택지를 비교해주세요.
${qNote}
${yearNote}
${relNote}

[선택지 A: 현재 직장·분야 유지]와 [선택지 B: 이직·전환·새로운 시도]를 ${name}님 사주와 ${yr}년 흐름으로 비교하세요.
각 선택지의 장점, 위험, 지금 더 유리한 방향, 그 조건을 포함하세요.
4~5단락. 반드시 해요체, 마크다운 금지. 사용자에게 추가 정보를 요구하지 마세요.${completeNote}`;
    }
    if (cat === 'business') {
      return `${name}님의 [사업·부업] 고민에서 실제 선택지를 비교해주세요.
${qNote}
${yearNote}
${relNote}

[선택지 A: 지금 바로 시작·확장]와 [선택지 B: 더 준비 후 시작 또는 유지]를 ${name}님 사주와 ${yr}년 흐름으로 비교하세요.
각 선택지의 장점, 위험, 지금 더 유리한 방향을 포함하세요.
4~5단락. 반드시 해요체, 마크다운 금지. 사용자에게 추가 정보를 요구하지 마세요.${completeNote}`;
    }
    /* money / love / marriage / family / custom */
    return `${name}님의 고민 [${topicLabel}]에서 지금 실질적으로 갈리는 두 방향을 비교해주세요.
${qNote}
${yearNote}
${relNote}

${name}님의 실제 상황에 맞는 선택지 A·B를 직접 정해서 비교하세요. 사용자에게 추가 정보를 요구하지 마세요.
각 선택지의 장점, 위험, 지금 더 유리한 방향, 그 이유를 포함하세요.
4~5단락. 반드시 해요체, 마크다운 금지.${completeNote}`;
  }

  /* 섹션 3: 밀어야 할 방향 */
  function buildP3() {
    const yearPushNote = cat === 'year'
      ? `올해 가장 크게 움직이는 영역을 기준으로 실제 밀어야 할 행동을 알려주세요. 관계·배우자 중심이 아니라 올해 핵심 영역(일·재물·건강·변화 등) 중심으로 작성하세요.`
      : `[${topicLabel}] 분야에서 ${yr}년 지금 실제로 밀어야 할 방향을 알려주세요.`;
    return `${yearPushNote}
${yearNote}
${relNote}

${name}님의 사주 기질과 ${yr}년 ${sw} 에너지에서 가장 잘 맞는 방향, 그 이유, 지금 당장 시작할 수 있는 구체적 행동 1~2가지.
같은 오행 설명을 반복하지 마세요. 결론과 행동 위주로 간결하게.
3~4단락. 반드시 해요체, 마크다운 금지.${completeNote}`;
  }

  /* 섹션 4: 피해야 할 선택 */
  function buildP4() {
    const yearAvoidNote = cat === 'year'
      ? `올해 가장 에너지를 소진시키는 방향, 서두르면 안 되는 결정, 피해야 할 선택을 알려주세요. 단순히 '배우자와 대화하세요'가 아니라 올해 흐름에서 실제로 조심할 것들을 짚어주세요.`
      : `[${topicLabel}] 분야에서 ${yr}년 지금 피해야 할 선택을 알려주세요.`;
    return `${yearAvoidNote}
${yearNote}
${relNote}

사주에서 보이는 반복적 실수 패턴, ${yr}년 ${sw}에서 특히 조심해야 할 결정. 두렵게 만들지 말고 따뜻하고 실용적으로.
같은 오행 설명 반복 금지. 결론 위주로.
3~4단락. 반드시 해요체, 마크다운 금지.${completeNote}`;
  }

  /* 섹션 5: 연도별 흐름 JSON */
  const yr2 = yr + 1, yr3 = yr + 2;
  function buildP5() {
    const yearFlowNote = cat === 'year'
      ? `각 연도 카드는 일·재물·관계·건강·변화 중 그해 가장 중요한 영역을 중심으로 서로 다르게 작성하세요. 3개 연도가 모두 같은 영역(특히 관계·배우자)만 담으면 안 됩니다.`
      : `각 연도에서 [${topicLabel}] 고민과 관련된 흐름을 중심으로 서로 다르게 작성하세요.`;
    return `${name}님의 ${yr}년, ${yr2}년, ${yr3}년 흐름을 분석해주세요.
${yearNote}
${yearFlowNote}

아래 JSON 배열 형식으로만 정확히 작성하세요. 다른 텍스트 없이 JSON만:
[
  {"year":${yr},"sewoon":"${sw}","flow":"그해 핵심 역할·가장 크게 움직이는 영역 (2~3문장)","action":"밀어야 할 행동 (1~2문장)","caution":"주의할 선택 (1~2문장)"},
  {"year":${yr2},"sewoon":"세운간지","flow":"...","action":"...","caution":"..."},
  {"year":${yr3},"sewoon":"세운간지","flow":"...","action":"...","caution":"..."}
]

${yr}년을 "지난해"로 쓰지 마세요. 세운 간지와 대운을 혼동하지 마세요. 각 항목은 완성된 문장으로 작성하세요.`;
  }

  /* 섹션 6: 30일 행동 계획 */
  function buildP6() {
    const yearPlanNote = cat === 'year'
      ? `배우자와의 대화 위주가 아니라, 올해 핵심 영역(일·재물·건강·변화 등)에서 실제 실행할 행동으로 구성하세요. 관계 관련 행동은 관계가 실제 1순위 영역인 경우에만 포함하세요.`
      : `[${topicLabel}] 분야에서 실제 실행할 수 있는 행동 계획으로 구성하세요.`;
    return `${name}님의 앞으로 30일 행동 계획을 짜주세요.
${yearNote}
${relNote}
${yearPlanNote}

반드시 아래 4개 주차를 모두 포함하세요:
1주차 (1~7일): 목표 + 구체적 행동 2가지
2주차 (8~14일): 목표 + 구체적 행동 2가지
3주차 (15~21일): 목표 + 구체적 행동 2가지
4주차 (22~30일): 목표 + 구체적 행동 2가지

미래 사건 예측이 아니라 ${name}님이 실제 실행할 수 있는 행동으로 작성하세요.
반드시 해요체, 마크다운 금지.${completeNote}`;
  }

  /* 섹션 7: 매력살·귀인 */
  function buildP7() {
    return `${name}님 사주에서 실제 성립하는 매력살·귀인을 확인하고 [${topicLabel}]와 연결해서 해석해주세요.
${yearNote}

[확인 대상] 도화살, 화개살, 홍염살, 천을귀인, 천덕귀인, 월덕귀인, 문창귀인, 학당귀인, 태극귀인

각 항목은 실제 사주에서 성립 여부를 확인한 뒤:
- 성립한 경우: 명칭, 성립 위치, [${topicLabel}]에서의 역할, ${yr}년 활용 방법을 설명하세요.
- 성립하지 않는 경우: 있다고 만들지 마세요.

성립한 항목이 없다면 제목을 "올해 활용할 나의 강점"으로 바꾸고, 원국의 실제 강점과 ${yr}년 활용 방법을 대신 설명하세요. 보편적인 성향 설명을 장황하게 쓰지 마세요.

2~3단락. 반드시 해요체, 마크다운 금지.${completeNote}`;
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
    sections.push({ icon: '⚖️', label: '현재 선택지 비교', content: r2.content, focusType: 'choices' });
  } else {
    failedSections.push({ name: '선택지 비교', reason: r2.reason });
    sections.push({ icon: '⚖️', label: '현재 선택지 비교', content: r2.content || '(생성 오류)', focusType: 'choices' });
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
    sections.push({ icon: '🗓️', label: '앞으로 30일 행동 순서', content: r6.content });
  } else {
    failedSections.push({ name: '30일 행동 순서', reason: r6.reason });
    sections.push({ icon: '🗓️', label: '앞으로 30일 행동 순서', content: r6.content || '(생성 오류)' });
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

  /* ── 임계 섹션 실패 시 이메일 차단 ── */
  const criticalFailed = failedSections.filter(f =>
    ['핵심 답변', '30일 행동 순서', '마무리 메시지'].includes(f.name)
  );
  if (criticalFailed.length > 0) {
    const details = criticalFailed.map(f => `${f.name}(${f.reason})`).join(', ');
    throw new Error(`generation_incomplete: ${details}`);
  }

  return { sections, closingMessage };
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

    const { sections: focusSections, closingMessage } = await generateFocusReading(
      sajuData, ctx, name, currentYear, currentSewoon, systemPrompt
    );
    sections.push(...focusSections);

    const html = buildEmailHtml(
      name,
      { infoLine, topicLine: `선택한 고민 · ${topicLabel}`, basisLine },
      sections,
      closingMessage || '',
      '내 질문 하나 집중 리딩'
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
    await redis.del(`saju_pending:${email.toLowerCase().trim()}`);
    await notifyAdmin(
      `[오속 사주] ✅ 발송 완료 — ${name}님`,
      `리딩 이메일 발송 완료!\n\n고객: ${name}님\n이메일: ${email}\n상품: 내 질문 하나 집중 리딩 (4,900원)\n고민: ${sajuData.concern?.label || '-'}`
    );
    return;
  }

  /* basic / premium — 종합 리딩 */
  const relStatus = sajuData.relationStatus || 'private';
  const loveCfg   = REL_LOVE_CONFIG[relStatus] || REL_LOVE_CONFIG.private;

  /* 1. 질문 맞춤 답변 */
  if (sajuData.customQuestion || sajuData.concern?.question) {
    const q = sajuData.customQuestion || sajuData.concern.question;
    const questionTopic = sajuData.questionTopic || sajuData.concern?.label || '';
    const qPrompt = `${name}님의 질문: ${q}

${questionTopic ? `[${questionTopic}] 영역 중심으로 ` : ''}사주팔자를 바탕으로 깊이 있고 구체적인 답변을 작성해주세요.
먼저 이 질문과 관련된 사주 영역을 짚고, ${currentYear}년 흐름에서 어떤 방향성이 보이는지, 구체적인 시기가 있다면 명확하게, 지금 당장 실천할 수 있는 행동 방향 1~2가지로 마무리해주세요.
4~5단락. 반드시 해요체, 마크다운 금지.`;
    const content = await generateReading(ctx, qPrompt, systemPrompt);
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

    const content = await generateReading(ctx, prompt, systemPrompt);
    sections.push({ icon: cat.icon, label, content });
  }

  /* 3. 시기 요약표 */
  const now2       = new Date();
  const startYear  = now2.getFullYear();
  const startMonth = now2.getMonth() + 1;
  const timelinePrompt = `${name}님의 사주팔자를 바탕으로 ${startYear}년 ${startMonth}월부터 12개월간 핵심 시기를 분석해주세요.

각 달을 아래 형식으로 정확히 작성 (파이프 기호로 구분):
YYYY년 MM월 | 에너지 | 한 줄 설명

에너지는 반드시 다음 4가지 중 하나만 사용: 기회, 안정, 전환, 주의

12개월 전부 작성. 다른 텍스트 없이 표 형식만.`;
  const timelineRaw = await generateReading(ctx, timelinePrompt, systemPrompt, 1200);
  sections.push({ icon: '📅', label: `${startYear} 핵심 시기 요약`, content: timelineRaw, isTimeline: true });

  /* 4. 지금부터 준비해야 할 것 */
  const actionPrompt = `${name}님의 사주팔자와 ${currentYear}년 운의 흐름을 바탕으로 "지금부터 준비해야 할 것"을 작성해주세요.
${name}님의 기질과 ${currentYear}년 대운·세운 에너지에 맞는 구체적 준비 방향을 담아주세요. 재물·관계·일·내면 등 중요한 영역에서 지금 당장 시작할 수 있는 것과 올해 안에 준비해야 할 것을 나눠서.
5~6단락. 반드시 해요체, 마크다운 금지.`;
  const actionContent = await generateReading(ctx, actionPrompt, systemPrompt, 1600);
  sections.push({ icon: '🚀', label: '지금부터 준비해야 할 것', content: actionContent });

  /* 5. 프리미엄 전용 */
  if (tier === 'premium') {
    for (const cat of PREMIUM_PROMPTS) {
      const content = await generateReading(ctx, cat.prompt, systemPrompt);
      sections.push({ icon: cat.icon, label: cat.label, content });
    }
  }

  /* 6. 마무리 메시지 */
  const closingPrompt = `${name}님의 사주 리딩을 마무리하는 따뜻한 메시지를 3~4문장으로 작성해주세요. 이 사람의 기질과 ${currentYear}년 에너지를 담아 개인화되게. 반드시 해요체, 마크다운 금지.`;
  const closingMsg = await generateReading(ctx, closingPrompt, systemPrompt, 600);

  const productLabel = tier === 'premium' ? '★ 프리미엄 종합 풀이' : null;
  const html = buildEmailHtml(
    name,
    { infoLine, topicLine: null, basisLine: null },
    sections,
    closingMsg,
    productLabel
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

  await redis.del(`saju_pending:${email.toLowerCase().trim()}`);
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
