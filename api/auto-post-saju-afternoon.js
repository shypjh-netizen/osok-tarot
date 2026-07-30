const USER_ID = '27916228654726680'; // osok.saju

const STEMS    = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const STEM_ELEMENT = ['목','목','화','화','토','토','금','금','수','수'];

// 생년 끝자리 → 천간·오행 (사용자 스펙)
const DIGIT_STEM    = ['경','신','임','계','갑','을','병','정','무','기'];
const DIGIT_ELEMENT = ['금','금','수','수','목','목','화','화','토','토'];

// 천간 관계 (통합 인덱스: 갑=0 을=1 병=2 정=3 무=4 기=5 경=6 신=7 임=8 계=9)
const STEM_HAP   = [[0,5],[1,6],[2,7],[3,8],[4,9]];
const STEM_CHUNG = [[0,6],[1,7],[2,8],[3,9]];

// 오행 순서: 목=0 화=1 토=2 금=3 수=4
const ELEMENT_ORDER = ['목','화','토','금','수'];

function getJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
}

function getTodayIljin() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const cycle = ((getJDN(y, m, d) - 2451491) % 60 + 60) % 60;
  const stemIdx   = cycle % 10;
  const branchIdx = cycle % 12;
  return {
    stem:        STEMS[stemIdx],
    branch:      BRANCHES[branchIdx],
    stemIdx,
    branchIdx,
    stemElement: STEM_ELEMENT[stemIdx],
    name:        STEMS[stemIdx] + BRANCHES[branchIdx] + '일',
  };
}

// 생년 끝자리 → 천간 통합 인덱스 (0→경=6, 4→갑=0 등)
function getDigitStemIdx(digit) { return (digit + 6) % 10; }

function stemRelation(todayStemIdx, digitStemIdx) {
  for (const [a, b] of STEM_HAP) {
    if ((todayStemIdx===a&&digitStemIdx===b)||(todayStemIdx===b&&digitStemIdx===a)) return 'hap';
  }
  for (const [a, b] of STEM_CHUNG) {
    if ((todayStemIdx===a&&digitStemIdx===b)||(todayStemIdx===b&&digitStemIdx===a)) return 'chung';
  }
  return 'neutral';
}

function elementRelation(todayElem, digitElem) {
  const ti = ELEMENT_ORDER.indexOf(todayElem);
  const di = ELEMENT_ORDER.indexOf(digitElem);
  if (ti < 0 || di < 0 || ti === di) return 'neutral';
  if ((di + 1) % 5 === ti) return 'saeng_in';  // digit이 today를 생 (인성)
  if ((ti + 1) % 5 === di) return 'saeng_out'; // today가 digit를 생 (식상)
  if ((di + 2) % 5 === ti) return 'geuk_in';   // digit이 today를 극 (관성)
  if ((ti + 2) % 5 === di) return 'geuk_out';  // today가 digit를 극 (재성)
  return 'neutral';
}

// 천간 음양: 통합 인덱스 짝수=양, 홀수=음
function isYangStem(stemUnifiedIdx) { return stemUnifiedIdx % 2 === 0; }

function calculateAllDigits(iljin) {
  return Array.from({ length: 10 }, (_, digit) => {
    const dStemIdx = getDigitStemIdx(digit);
    const stemRel  = stemRelation(iljin.stemIdx, dStemIdx);
    const elemRel  = stemRel !== 'neutral' ? stemRel : elementRelation(iljin.stemElement, DIGIT_ELEMENT[digit]);
    return {
      digit,
      stem:    DIGIT_STEM[digit],
      element: DIGIT_ELEMENT[digit],
      yinYang: isYangStem(dStemIdx) ? '양' : '음',
      stemRel,
      elemRel,
    };
  });
}

function relLabel(d, iljin) {
  if (d.stemRel === 'hap')   return `천간합(${iljin.stem}${d.stem}합)`;
  if (d.stemRel === 'chung') return `천간충(${iljin.stem}${d.stem}충)`;
  const map = {
    saeng_in:  `${d.element}생${iljin.stemElement}(인성·지원)`,
    saeng_out: `${iljin.stemElement}생${d.element}(식상·소모)`,
    geuk_in:   `${d.element}극${iljin.stemElement}(관성·제약)`,
    geuk_out:  `${iljin.stemElement}극${d.element}(재성·주도)`,
    neutral:   '비화·중립',
  };
  return map[d.elemRel] || '중립';
}

async function generateAfternoonContent(iljin, digitData) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  const digitDesc = digitData
    .map(d => `${d.digit}: ${d.stem}(${d.yinYang}${d.element}) — ${relLabel(d, iljin)}`)
    .join('\n');

  const prompt = `당신은 사주명리학을 쉽고 따뜻하게 전하는 콘텐츠 작가입니다.
아래 계산 결과만 사용해 오늘의 참여형 콘텐츠를 작성하세요.

오늘: ${month}월 ${day}일 / 일진: ${iljin.name} (천간: ${iljin.stem}·${iljin.stemElement}, 지지: ${iljin.branch})

[계산된 생년 끝자리별 관계]
${digitDesc}

[관계별 해석 방향]
- 천간합: 오늘 일진과 기운이 맞물리는 날. 추진·협력·중요한 연결에 좋음.
- 천간충: 긴장과 충돌 가능성. 결정·계약·대화에서 조건을 재확인해야 함.
- 인성(생받음): 집중력·판단력이 채워지는 날. 학습·기획·마감에 강점.
- 식상(생줌): 표현과 활동이 활발하지만 에너지와 지출이 새어나가기 쉬운 날.
- 관성(극받음): 외부 압박·제약이 작용. 무리한 실행보다 점검·정비에 집중.
- 재성(극함): 주도적으로 움직이기 좋은 날. 협상·결정·제안을 먼저 꺼내기 좋음.
- 비화·중립: 뚜렷한 기복 없이 안정적. 반복 업무·유지·마무리에 적합.

[음양 차별화 — 반드시 적용]
같은 오행이라도 양간(경·임·갑·병·무)과 음간(신·계·을·정·기)은 특성이 달라요.
양간: 적극적·결단적·외향적으로 기운이 작용
음간: 세밀·유연·내향적으로 기운이 작용
같은 관계 유형이라도 양간과 음간의 키워드와 행동은 달라야 해요.

[현실 영역]
각 숫자에 다음 중 가장 관련 있는 한 가지를 선택해 구체적 행동을 제안합니다.
업무·마감 / 계약·결정 / 소비·지출 / 연락·대화 / 관계의 경계 / 약속·일정 / 정리·휴식 / 시작·실행 / 제안·협력 / 집중·우선순위

[출력 섹션]

섹션1 — 본문 (main_post):
아래 구조를 자연스럽게 변형합니다. 매번 같은 문장 반복 금지.

"태어난 연도의 마지막 숫자를 확인해보세요.

1984년생이라면 4,
1990년생이라면 0이에요.

오늘 내 숫자에 맞는 흐름을
첫 번째 답글에 정리해두었어요.

결과를 보기 전에 내 숫자부터 정해보세요. ✨"

섹션2 — 첫 번째 답글 (reply_post):
아래 형식을 정확히 따릅니다.

"오늘의 생년 끝자리 흐름 ✦

0 — 핵심 키워드. 구체적 행동.
1 — 핵심 키워드. 구체적 행동.
2 — 핵심 키워드. 구체적 행동.
3 — 핵심 키워드. 구체적 행동.
4 — 핵심 키워드. 구체적 행동.
5 — 핵심 키워드. 구체적 행동.
6 — 핵심 키워드. 구체적 행동.
7 — 핵심 키워드. 구체적 행동.
8 — 핵심 키워드. 구체적 행동.
9 — 핵심 키워드. 구체적 행동.

태어난 해의 천간만 활용한 가벼운 오늘의 흐름이에요.
오늘 내 숫자와 잘 맞았다면 숫자 하나만 남겨주세요. ✨"

[해석 규칙]
- 각 숫자마다 핵심 키워드를 하나씩 부여하고 같은 답글 안에서 중복하지 않습니다.
- "흐름에 맞게 움직이세요", "에너지를 유지하세요", "꾸준히 이어가세요", "오늘 흐름이 좋아요" 금지.
- "무리하지 마세요", "천천히 가세요"로만 끝내지 말고 무엇을 어떻게 확인하거나 조절해야 하는지 명시합니다.
- 숫자별 결과가 서로 바뀌어도 어색하지 않은 수준이면 다시 작성합니다.
- 같은 오행 쌍(0&1, 2&3, 4&5, 6&7, 8&9)은 키워드와 행동이 분명히 달라야 합니다.
- 횡재·합격·연락·재회·사고 등 특정 사건을 확정하지 않습니다.
- 전문용어(합·충·생·극·오행 이름)는 답글 본문에 노출하지 않습니다.
- 불안과 공포를 이용하지 않습니다.
- 해시태그, URL, 링크 없음.
- 이모지는 본문 끝 ✨, 답글 제목 ✦, 답글 끝 ✨만 사용합니다.
- 마크다운(**) 사용 금지.
- 해요체로 작성합니다.

[분량 규칙]
- 첫 번째 답글 전체를 공백·줄바꿈 포함 470자 이하로 작성합니다.
- 분량 초과 시 중복 수식어와 불필요한 연결 표현을 줄입니다. 구체적 행동은 삭제하지 않습니다.

[최종 확인]
- 0~9 모두 작성됐는가?
- 같은 오행 쌍(0&1, 2&3, 4&5, 6&7, 8&9) 키워드와 행동이 다른가?
- 동일 답글 안에서 키워드가 중복되는가? → 교체
- 특정 사건을 확정한 표현이 있는가? → 수정
- URL·해시태그가 있는가? → 삭제
- 답글이 470자를 초과하는가? → 압축

최종 결과는 반드시 아래 JSON 형식으로만 출력합니다.
{"main_post":"완성된 본문","reply_post":"완성된 첫번째답글"}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const raw = data.content[0].text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(raw);
}

// 500자 초과 시 자동으로 답글 체인으로 분할해서 게시
async function postThreadChain(text, token, replyToId = null) {
  const MAX = 498;

  const chunks = [];
  while (text.length > 0) {
    if (text.length <= MAX) { chunks.push(text); break; }
    // 문단 구분(\n\n) → 단일 줄바꿈(\n) → 불가피한 경우에만 글자 위치 순으로 시도
    let splitAt = text.lastIndexOf('\n\n', MAX);
    if (splitAt <= 0) splitAt = text.lastIndexOf('\n', MAX);
    if (splitAt <= 0) splitAt = MAX;
    chunks.push(text.slice(0, splitAt).trimEnd());
    text = text.slice(splitAt).trimStart();
  }

  let lastId = replyToId;
  for (const chunk of chunks) {
    const body = { media_type: 'TEXT', text: chunk, access_token: token };
    if (lastId) body.reply_to_id = lastId;

    const createRes = await fetch(
      `https://graph.threads.net/v1.0/${USER_ID}/threads`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const createData = await createRes.json();
    if (!createData.id) throw new Error(`Container 생성 실패: ${JSON.stringify(createData)}`);

    await new Promise(r => setTimeout(r, 30000));

    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${USER_ID}/threads_publish`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: createData.id, access_token: token }) }
    );
    const publishData = await publishRes.json();
    if (!publishData.id) throw new Error(`Publish 실패: ${JSON.stringify(publishData)}`);

    lastId = publishData.id;
  }
  return lastId;
}

async function postToThreads(text) {
  const token = process.env.THREADS_ACCESS_TOKEN_SAJU;
  return postThreadChain(text, token, null);
}

async function postReplyToThreads(text, replyToId) {
  const token = process.env.THREADS_ACCESS_TOKEN_SAJU;
  return postThreadChain(text, token, replyToId);
}

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isDry = req.query.dry === 'true';

  try {
    const iljin = getTodayIljin();
    const digitData = calculateAllDigits(iljin);
    const { main_post, reply_post } = await generateAfternoonContent(iljin, digitData);

    const rationale = digitData.map(d => ({
      digit: d.digit,
      stem: `${d.stem}(${d.element})`,
      stemRel: d.stemRel,
      elemRel: d.elemRel,
      label: relLabel(d, iljin),
    }));

    if (isDry) {
      return res.status(200).json({
        dry_run: true,
        next_schedule: '매주 월·수·금 오후 1시 (KST)',
        iljin: iljin.name,
        main_post,
        reply_post,
        계산근거: rationale,
        글자수: { main: main_post.length, reply: reply_post.length },
        연결방식: '본문 게시 성공 → 반환된 id로 reply_to_id 설정 → 첫 번째 답글 게시 (본문 실패 시 답글 미게시)',
      });
    }

    // 본문 게시
    const mainResult = await postToThreads(main_post);
    const mainPostId = mainResult.id;

    // 답글 게시 (본문 ID 사용)
    const replyResult = await postReplyToThreads(reply_post, mainPostId);

    return res.status(200).json({
      success: true,
      iljin: iljin.name,
      main_post_id: mainPostId,
      reply_id: replyResult.id,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
