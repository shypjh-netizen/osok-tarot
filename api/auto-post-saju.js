const USER_ID = '27916228654726680'; // osok.saju
const SAJU_URL = 'https://osok-tarot.vercel.app/saju.html';

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

async function generateMorningPost(iljin) {
  const prompt = `당신은 사주명리학을 쉽고 따뜻하게 전하는 콘텐츠 작가입니다.
오늘의 일진을 바탕으로 스레드에 올릴 데일리 사주 포스팅을 작성하세요.

오늘 일진: ${iljin.name} (${iljin.stemElement}·${iljin.branchElement} 기운, ${iljin.animal}의 날)

[오전 일진 리딩 규칙]
- 오늘 날의 에너지와 기운을 중심으로, 어떤 하루가 될 수 있는지 따뜻하게 전합니다.
- 어려운 사주 용어는 자연스럽게 풀어서 설명합니다.
- 오늘 이 에너지를 잘 활용하는 방법이나 주의할 점을 한 가지 제안합니다.
- 모든 날을 좋은 날로 포장하지 않고, 버텨야 하는 날이라면 솔직하게 알려줍니다.
- 운명론적이거나 과장된 표현 금지. "우주가", "반드시" 같은 표현 금지.
- 부드럽고 자연스러운 해요체로 작성합니다.

[구성]
도입부(1~2문장): 오늘 일진 이름을 자연스럽게 포함해 오늘의 에너지를 소개합니다.
1문단: 오늘 날의 기운과 전반적인 흐름을 설명합니다.
2문단: 이 에너지를 잘 활용하는 방법 또는 주의할 점을 전합니다.
CTA: 오늘 하루와 연결된 짧은 질문이나 공감 유도로 마무리합니다.

[공통 규칙]
- 이모지 1~2개만 사용합니다.
- 마크다운 기호(**) 사용 금지.
- 해시태그 2~3개, 반드시 모든 해시태그 앞에 #을 붙입니다. 예: #오늘의일진 #데일리사주
- 전체 분량 공백 포함 300~430자 이내.

[최종 확인] 출력 전 확인하세요.
- 일진 이름이 도입부에 자연스럽게 포함됐는가?
- 운명론적 표현이 없는가?
- 해시태그 앞에 모두 #이 붙어 있는가?

최종 결과는 반드시 아래 JSON 형식으로만 출력합니다.
{"iljin":"${iljin.name}","content":"완성된 게시물"}`;

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

async function generateEveningPost(theme) {
  const prompt = `당신은 사주명리학을 쉽고 따뜻하게 전하는 콘텐츠 작가입니다.
사주 서비스를 자연스럽게 소개하는 저녁 포스팅을 작성하세요.

타겟: ${theme.hook}
핵심 메시지: ${theme.angle}
CTA 방향: ${theme.cta}
연결 링크: ${SAJU_URL}

[저녁 마케팅 포스팅 규칙]
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
CTA: 링크(${SAJU_URL})로 자연스럽게 안내합니다. 링크는 줄바꿈 후 단독으로 배치합니다.

[공통 규칙]
- 이모지 1~2개만 사용합니다.
- 마크다운 기호(**) 사용 금지.
- 해시태그 2~3개, 반드시 모든 해시태그 앞에 #을 붙입니다. 예: #오속사주 #사주리딩
- 전체 분량 공백 포함 300~450자 이내.

[최종 확인] 출력 전 확인하세요.
- 광고처럼 느껴지지 않는가?
- 불안 자극이나 조급함 유발 표현이 없는가?
- 링크가 자연스럽게 포함됐는가?
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

async function postToThreads(text) {
  const token = process.env.THREADS_ACCESS_TOKEN_SAJU;

  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${USER_ID}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'TEXT', text, access_token: token }),
    }
  );

  const createData = await createRes.json();
  if (!createData.id) throw new Error(`Container 생성 실패: ${JSON.stringify(createData)}`);

  await new Promise(r => setTimeout(r, 30000));

  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${USER_ID}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: createData.id, access_token: token }),
    }
  );

  return await publishRes.json();
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

    let content;

    if (!isEvening) {
      // 오전 — 일진 리딩
      content = await generateMorningPost(iiljin);
    } else {
      // 저녁 — 마케팅 콘텐츠 (날짜 기반으로 테마 순환)
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      const theme = MARKETING_THEMES[dayOfYear % MARKETING_THEMES.length];
      content = await generateEveningPost(theme);
    }

    if (isDry) {
      return res.status(200).json({ dry_run: true, iljin: iiljin.name, isEvening, content });
    }

    const result = await postToThreads(content);

    return res.status(200).json({
      success: true,
      iljin: iiljin.name,
      isEvening,
      content,
      threads_id: result.id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
