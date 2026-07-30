const USER_ID = '27916228654726680'; // osok.saju

// 천간·지지
const STEMS   = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const BRANCH_ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];
const STEM_ELEMENT = ['목','목','화','화','토','토','금','금','수','수'];
const BRANCH_ELEMENT = ['수','토','목','목','토','화','화','토','금','금','토','수'];

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
    stem:          STEMS[stemIdx],
    branch:        BRANCHES[branchIdx],
    animal:        BRANCH_ANIMAL[branchIdx],
    stemElement:   STEM_ELEMENT[stemIdx],
    branchElement: BRANCH_ELEMENT[branchIdx],
    name:          STEMS[stemIdx] + BRANCHES[branchIdx] + '일',
  };
}

// ── 지지 관계 (인덱스: 자=0 축=1 인=2 묘=3 진=4 사=5 오=6 미=7 신=8 유=9 술=10 해=11)
const YUKHAP  = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];          // 육합 쌍
const SAMHAP  = [[8,0,4],[11,3,7],[2,6,10],[5,9,1]];              // 삼합 그룹
const CHUNG   = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];           // 충 쌍

// ── 천간 관계 (통합 인덱스: 갑=0 을=1 병=2 정=3 무=4 기=5 경=6 신=7 임=8 계=9)
const STEM_HAP   = [[0,5],[1,6],[2,7],[3,8],[4,9]]; // 갑기 을경 병신 정임 무계
const STEM_CHUNG = [[0,6],[1,7],[2,8],[3,9]];       // 갑경 을신 병임 정계

// 출생연도 → 천간 통합 인덱스 (1900=경자 기준)
function getYearStemIdx(year) { return ((year - 1900) % 10 + 6) % 10; }
// 출생연도 → 지지 인덱스
function getYearBranchIdx(year) { return ((year - 1900) % 12 + 12) % 12; }

function stemRelation(todayStemIdx, yearStemIdx) {
  for (const [a, b] of STEM_HAP) {
    if ((todayStemIdx===a&&yearStemIdx===b)||(todayStemIdx===b&&yearStemIdx===a)) return 'hap';
  }
  for (const [a, b] of STEM_CHUNG) {
    if ((todayStemIdx===a&&yearStemIdx===b)||(todayStemIdx===b&&yearStemIdx===a)) return 'chung';
  }
  return 'neutral';
}

function getBirthYearsForBranch(branchIdx) {
  const years = [];
  for (let y = 1970; y <= 2002; y++) {
    if (getYearBranchIdx(y) === branchIdx) years.push(y);
  }
  return years;
}

function calculateTodayZodiac(iljin) {
  const todayBranchIdx = BRANCHES.indexOf(iljin.branch);
  const todayStemIdx   = STEMS.indexOf(iljin.stem);
  if (todayBranchIdx < 0 || todayStemIdx < 0) {
    throw new Error(`일진 계산 오류: stem=${iljin.stem}, branch=${iljin.branch}`);
  }

  // 좋은 띠: 육합 우선, 삼합 보조
  const goodMap = {};
  for (const [a, b] of YUKHAP) {
    if (a === todayBranchIdx) goodMap[b] = '육합';
    if (b === todayBranchIdx) goodMap[a] = '육합';
  }
  for (const group of SAMHAP) {
    if (group.includes(todayBranchIdx)) {
      for (const b of group) {
        if (b !== todayBranchIdx && !goodMap[b]) goodMap[b] = '삼합';
      }
    }
  }

  // 주의 띠: 충
  const cautionMap = {};
  for (const [a, b] of CHUNG) {
    if (a === todayBranchIdx) cautionMap[b] = '충';
    if (b === todayBranchIdx) cautionMap[a] = '충';
  }

  // 육합 우선으로 좋은 띠 2개
  const goodEntries = Object.entries(goodMap)
    .sort(([,ra],[,rb]) => (ra==='육합'?0:1) - (rb==='육합'?0:1))
    .slice(0, 2);

  const cautionEntries = Object.entries(cautionMap).slice(0, 1);

  function buildZodiacEntry(branchIdx, reason, isGood) {
    const years = getBirthYearsForBranch(branchIdx);
    const yearData = years.map(year => {
      const yStemIdx = getYearStemIdx(year);
      return { year, stem: STEMS[yStemIdx], stemIdx: yStemIdx, relation: stemRelation(todayStemIdx, yStemIdx) };
    });
    let notable;
    if (isGood) {
      const hap = yearData.filter(y => y.relation === 'hap');
      const neutral = yearData.filter(y => y.relation === 'neutral');
      notable = [...hap, ...neutral].slice(0, 3);
    } else {
      const chung = yearData.filter(y => y.relation === 'chung');
      notable = chung.length > 0 ? chung.slice(0, 2) : yearData.slice(0, 2);
    }
    return {
      animal: BRANCH_ANIMAL[branchIdx],
      branch: BRANCHES[branchIdx],
      branchIdx, reason,
      notableYears: notable,
      allYears: years,
    };
  }

  const goodZodiacs   = goodEntries.map(([i, r]) => buildZodiacEntry(parseInt(i), r, true));
  const cautionZodiac = cautionEntries.length > 0
    ? buildZodiacEntry(parseInt(cautionEntries[0][0]), cautionEntries[0][1], false)
    : null;

  return {
    todayIljin: iljin.name, todayStem: iljin.stem, todayBranch: iljin.branch,
    todayStemIdx, todayBranchIdx,
    goodZodiacs, cautionZodiac,
    rationale: {
      육합: goodEntries.filter(([,r])=>r==='육합').map(([i])=>BRANCH_ANIMAL[parseInt(i)]),
      삼합: goodEntries.filter(([,r])=>r==='삼합').map(([i])=>BRANCH_ANIMAL[parseInt(i)]),
      충: cautionEntries.map(([i])=>BRANCH_ANIMAL[parseInt(i)]),
    },
  };
}

// 저녁 마케팅 테마
const MARKETING_THEMES = [
  {
    hook: '올해 유독 힘들었던 분',
    angle: '올해 세운이 유독 버거웠던 사주가 있어요. 내 기운과 올해 흐름이 충돌하고 있다면, 열심히 해도 안 풀리는 게 당연한 시기일 수 있어요.',
    cta: '내 사주가 올해 흐름과 맞는지 궁금하다면',
  },
  {
    hook: '이 일이 나한테 맞는 건지 모르겠는 분',
    angle: '사주에는 타고난 적성이 보여요. 어떤 환경에서 에너지가 살아나는지, 어떤 일을 할 때 소진되는지 — 그게 사주팔자에 다 담겨 있어요.',
    cta: '내가 빛날 수 있는 방향이 궁금하다면',
  },
  {
    hook: '돈이 모이지 않는 이유가 있어요',
    angle: '재물운은 노력만으로 바꾸기 어려운 부분이 있어요. 사주에서 보이는 재물 그릇, 돈이 들어오고 나가는 패턴 — 알고 나면 쓸데없는 곳에 에너지를 낭비하지 않아도 돼요.',
    cta: '내 재물운의 흐름이 궁금하다면',
  },
  {
    hook: '연애가 잘 안 되는 분',
    angle: '연애가 반복적으로 비슷한 패턴으로 끝난다면, 사주에서 그 이유가 보일 수 있어요. 내가 끌리는 사람의 유형, 관계에서 내가 반복하는 태도 — 알면 달라질 수 있어요.',
    cta: '내 연애 패턴이 궁금하다면',
  },
  {
    hook: '뭔가 변해야 할 것 같은 분',
    angle: '사주에는 변화의 타이밍이 보여요. 지금이 밀고 나가야 할 시기인지, 잠깐 멈춰서 정비해야 할 시기인지 — 그 흐름을 알면 소진되지 않아도 돼요.',
    cta: '지금이 어떤 시기인지 확인하고 싶다면',
  },
  {
    hook: '선택 앞에서 자꾸 흔들리는 분',
    angle: '결정이 어려운 데는 이유가 있어요. 내 사주의 기질상 어떤 선택 방식이 맞는지, 지금 대운 흐름에서 어느 방향에 무게를 실어야 하는지 — 사주가 나침반이 돼줄 수 있어요.',
    cta: '지금 고민 중인 선택이 있다면',
  },
  {
    hook: '요즘 유독 에너지가 없는 분',
    angle: '사주에는 체질적인 에너지 패턴이 담겨 있어요. 내가 소진되는 시기, 회복되는 방법 — 타고난 오행의 흐름을 알면 내 몸과 마음을 더 잘 돌볼 수 있어요.',
    cta: '내 에너지 흐름이 궁금하다면',
  },
  {
    hook: '3년 후 내 모습이 궁금한 분',
    angle: '대운의 흐름을 보면 앞으로 어떤 시기가 오는지 보여요. 지금 준비해야 할 것과, 기회가 찾아오는 시기 — 미리 알면 그때 제대로 잡을 수 있어요.',
    cta: '앞으로 3년의 흐름이 궁금하다면',
  },
];

async function generateMorningPost(iljin, zodiacData) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  // 좋은 띠 데이터 텍스트
  const goodDesc = zodiacData.goodZodiacs.map(z => {
    const yrs = z.notableYears.map(y => `${y.year}년생(${y.stem}${z.branch}년·${y.relation})`).join(', ');
    return `${z.animal}띠 (${z.reason}): 주목생년 ${yrs}`;
  }).join('\n');

  const cautionDesc = zodiacData.cautionZodiac ? (() => {
    const z = zodiacData.cautionZodiac;
    const yrs = z.notableYears.map(y => `${y.year}년생(${y.stem}${z.branch}년·${y.relation})`).join(', ');
    return `${z.animal}띠 (${z.reason}): 주의생년 ${yrs}`;
  })() : '없음';

  const goodAnimals = zodiacData.goodZodiacs.map(z => z.animal + '띠').join('와 ');
  const cautionAnimal = zodiacData.cautionZodiac ? zodiacData.cautionZodiac.animal + '띠' : '';

  const prompt = `당신은 사주명리학을 쉽고 따뜻하게 전하는 콘텐츠 작가입니다.
아래 계산 결과만 사용해 오늘의 띠별 일일 흐름 게시물을 본문과 연결 답글 두 섹션으로 작성하세요.

오늘: ${month}월 ${day}일 / 일진: ${zodiacData.todayIljin}

[계산된 데이터 — 이 데이터 외의 띠·생년을 임의로 추가하지 마세요]
흐름이 좋은 띠:
${goodDesc}

속도를 조절할 띠:
${cautionDesc}

════════════════════════
섹션1 — 본문 (main_post)
════════════════════════

아래 구조를 자연스럽게 변형합니다. 매번 같은 문장 반복 금지.

첫 문장 (고정):
"${month}월 ${day}일, 오늘 흐름이 열리는 띠는 ${goodAnimals}예요. ✨"

이어서:
- 오늘 흐름이 좋은 이유를 1~2문장으로 자연스럽게 연결합니다 (전문용어 없이).

주의 띠:
"오늘 한 번 더 확인해야 할 띠는 ${cautionAnimal}예요. ⚠️"
- 불안 없이, 오늘 특히 주의할 행동 한 가지를 한 문장으로 씁니다.

[본문 규칙]
- 답글·댓글·아래·다음 글·첫 번째·확인해보세요 등 연결 구조를 설명하는 표현 절대 금지.
- 본문은 주의 띠 안내 문장으로 자연스럽게 끝납니다. 추가 안내 불필요.
- 이모지는 ✨ 1개, ⚠️ 1개만.
- 공백 포함 100~200자.

════════════════════════
섹션2 — 연결 답글 (reply_post)
════════════════════════

아래 형식을 정확히 따릅니다. 별도 도입 문장 없이 바로 시작합니다.

"✨ 흐름이 좋은 ${zodiacData.goodZodiacs[0]?.animal}띠${zodiacData.goodZodiacs[1] ? '\n\n✨ 흐름이 좋은 ' + zodiacData.goodZodiacs[1].animal + '띠' : ''}

[각 좋은 띠마다]
{year}년생 — 구체적 행동 한 가지.
(주목생년만 작성, 데이터에 없는 생년 추가 금지)

⚠️ 한 번 더 확인할 ${cautionAnimal}

[주의 띠]
{year}년생 — 말·지출·계약·관계·결정 중 하나를 구체적으로.
(주의생년만 작성)

※ 태어난 해를 기준으로 살펴본 가벼운 오늘의 흐름이에요.
내 띠가 나오는 날을 놓치고 싶지 않다면 팔로우해두세요. ✨"

[답글 규칙]
- 계산 데이터에 없는 띠·생년 절대 추가 금지.
- 답글·댓글·아래·다음 글·첫 번째 등 연결 구조 설명 표현 금지.
- "돈이 들어온다", "연락이 온다", "사고가 난다" 사건 확정 표현 금지.
- 각 생년마다 구체적 행동 1가지, 중복 표현 금지.
- 육합·삼합·충 전문용어 사용 금지.
- 이모지는 좋은 띠 제목의 ✨, 주의 띠 제목의 ⚠️, 마지막 CTA의 ✨만.
- 해시태그, URL 없음. 마크다운(**) 금지. 해요체.
- 공백·줄바꿈 포함 350~470자.

[최종 확인]
- 본문에 답글·아래·다음 글 등 연결 설명이 있는가? → 있으면 삭제
- 데이터에 없는 띠·생년이 추가됐는가? → 있으면 삭제
- 사건 확정 표현이 있는가? → 있으면 수정
- 본문이 100~200자 범위인가? → 아니면 조정
- 답글이 350~470자 범위인가? → 아니면 조정

최종 결과는 반드시 아래 JSON 형식으로만 출력합니다.
{"main_post":"완성된 본문","reply_post":"완성된 연결 답글"}`;

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
  return JSON.parse(raw); // { main_post, reply_post }
}

async function generateEveningPost(theme, useProfileCta) {
  const ctaInstruction = useProfileCta
    ? `CTA: 사주가 궁금한 독자를 프로필로 자연스럽게 안내합니다. URL을 직접 쓰지 말고 "프로필에서 무료로 확인해보세요" 방식으로만 안내합니다. 게시물당 한 문장만 사용합니다.
CTA 예시 (매번 같은 표현 반복 금지, 내용에 맞게 변형):
- 내 사주가 궁금하다면 프로필에서 무료로 확인해보세요. ✨
- 지금 내 흐름이 궁금하다면 프로필의 무료 사주에서 확인해보세요.
- 타고난 성향과 올해의 흐름은 프로필에서 무료로 살펴볼 수 있어요.`
    : `CTA: 독자가 공감하거나 자신을 돌아볼 수 있는 짧은 질문 또는 여운이 남는 문장으로 마무리합니다.
유형 중 하나를 선택하세요: 공감 질문 / 한 단어 답변 유도 / 선택형 질문 / 여운형 문장
댓글·좋아요·이모지 반응을 동시에 요구하지 마세요. CTA는 한 문장만 사용합니다.`;

  const prompt = `당신은 사주명리학을 쉽고 따뜻하게 전하는 콘텐츠 작가입니다.
사주 이야기를 자연스럽게 전하는 저녁 포스팅을 작성하세요.

타겟: ${theme.hook}
핵심 메시지: ${theme.angle}
CTA 방향: ${theme.cta}

[저녁 포스팅 규칙]
- 광고처럼 느껴지지 않게, 공감에서 시작해 자연스럽게 사주로 연결합니다.
- 독자가 "나 얘기네"라고 느낄 수 있는 구체적인 상황이나 감정을 짚어줍니다.
- 사주의 가치를 운명 예언이 아닌 "나를 이해하는 도구"로 전달합니다.
- 과장하거나 불안을 자극하는 표현 금지.
- "지금 바로", "놓치면 안 돼요" 같은 조급함 유발 표현 금지.
- 부드럽고 자연스러운 해요체로 작성합니다.

[구성]
도입부(1~2문장): 타겟의 상황에 공감하며 시작합니다.
1문단: 핵심 메시지를 전합니다.
2문단: 사주로 알 수 있는 것을 구체적으로 언급합니다.
${ctaInstruction}

[공통 규칙]
- 본문에 http:// 또는 https://로 시작하는 URL을 절대 포함하지 마세요.
- 홈페이지 주소를 텍스트로 직접 작성하지 마세요.
- 이모지 1~2개만 사용합니다.
- 마크다운 기호(**) 사용 금지.
- 해시태그 2~3개, 반드시 모든 해시태그 앞에 #을 붙입니다. 예: #오속사주 #사주리딩
- 전체 분량 공백 포함 300~450자 이내.

[최종 확인] 출력 전 확인하세요.
- 본문에 http:// 또는 https://가 포함되지 않았는가?
- 홈페이지 주소가 텍스트에 포함되지 않았는가?
- 광고처럼 느껴지지 않는가?
- 불안 자극이나 조급함 유발 표현이 없는가?
- CTA가 한 문장인가?
- 해시태그 앞에 모두 #이 붙어 있는가?

최종 결과는 반드시 아래 JSON 형식으로만 출력합니다.
{"content":"완성된 게시물"}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const raw = data.content[0].text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(raw).content;
}

// 500자 초과 시 자동으로 답글 체인으로 분할해서 게시
async function postThreadChain(text, token, replyToId = null) {
  const MAX = 498;

  // 텍스트를 500자 단위로 분할 (줄바꿈 기준 우선)
  const chunks = [];
  while (text.length > 0) {
    if (text.length <= MAX) { chunks.push(text); break; }
    // 분단 구분(\n\n) → 단일 줄바꿈(\n) → 불가피한 경우에만 글자 위치 순으로 시도
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

  try {
    const hour = parseInt(new Date().toLocaleString('ko-KR', { hour: 'numeric', hour12: false, timeZone: 'Asia/Seoul' }));
    const isEvening = hour >= 12;
    const iiljin = getTodayIljin();
    const isDry = req.query.dry === 'true';

    let morningRationale = null;
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

    if (!isEvening) {
      // 오전 — 띠별 일일 흐름 (본문 + 연결 답글)
      const zodiacData = calculateTodayZodiac(iiljin);
      morningRationale = {
        일진: zodiacData.todayIljin,
        선정근거: {
          육합으로_좋은띠: zodiacData.rationale.육합,
          삼합으로_좋은띠: zodiacData.rationale.삼합,
          충으로_주의띠: zodiacData.rationale.충,
        },
        좋은띠_상세: zodiacData.goodZodiacs.map(z => ({
          띠: z.animal + '띠',
          이유: z.reason,
          주목생년: z.notableYears.map(y => `${y.year}년(${y.stem}${z.branch}, ${y.relation})`),
        })),
        주의띠_상세: zodiacData.cautionZodiac ? {
          띠: zodiacData.cautionZodiac.animal + '띠',
          이유: zodiacData.cautionZodiac.reason,
          주의생년: zodiacData.cautionZodiac.notableYears.map(y => `${y.year}년(${y.stem}${zodiacData.cautionZodiac.branch}, ${y.relation})`),
        } : null,
      };

      const { main_post, reply_post } = await generateMorningPost(iiljin, zodiacData);

      if (isDry) {
        return res.status(200).json({
          dry_run: true, iljin: iiljin.name, isEvening,
          main_post, reply_post,
          글자수: { 본문: main_post.length, 답글: reply_post.length },
          선정근거: morningRationale,
        });
      }

      const mainResult = await postToThreads(main_post);
      const replyResult = await postReplyToThreads(reply_post, mainResult);

      return res.status(200).json({
        success: true, iljin: iiljin.name, isEvening,
        main_post, reply_post,
        main_threads_id: mainResult,
        reply_threads_id: replyResult,
      });

    } else {
      // 저녁 — 테마 순환 (날짜 기반)
      const theme = MARKETING_THEMES[dayOfYear % MARKETING_THEMES.length];
      const useProfileCta = (dayOfYear % 5 === 0);
      const content = await generateEveningPost(theme, useProfileCta);

      if (isDry) {
        return res.status(200).json({
          dry_run: true, iljin: iiljin.name, isEvening, content,
        });
      }

      const result = await postToThreads(content);

      return res.status(200).json({
        success: true, iljin: iiljin.name, isEvening, content,
        threads_id: result,
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
