import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const USER_ID = '27956402803984502';

const TAROT_CARDS = [
  '바보', '마법사', '여사제', '황후', '황제', '교황', '연인', '전차',
  '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 사람', '죽음',
  '절제', '악마', '탑', '별', '달', '태양', '심판', '세계',
  '완드 에이스', '완드 2', '완드 3', '완드 킹', '컵 에이스', '컵 2',
  '컵 3', '컵 퀸', '펜타클 에이스', '펜타클 4', '펜타클 10', '소드 에이스',
  '소드 2', '소드 6', '소드 퀸'
];

const CHOICE_TOPICS = [
  '지금 떠오르는 사람의 속마음',
  '기다리는 연락의 흐름',
  '내가 놓치고 있는 기회',
  '지금 그만둘지 계속할지',
  '가까운 흐름에서 들어올 변화',
  '현재 돈의 흐름을 막고 있는 것',
  '지금 먼저 정리해야 할 관계',
  '상대에게 먼저 연락해도 되는지',
  '이번 주 내가 듣게 될 소식',
  '지금 선택하면 좋은 방향',
];

const EVENING_TOPICS = [
  '연락은 없지만 끝난 것 같지 않은 관계',
  '나만 노력하는 것처럼 느껴지는 관계',
  '먼저 다가갈지 기다릴지 고민되는 관계',
  '상대의 말과 행동이 다른 관계',
  '반복해서 같은 문제로 다투는 관계',
  '멀어진 친구 또는 가족',
  '사과를 기다리는 마음',
  '관계를 놓아야 할지 고민되는 상태',
  '상대가 거리를 두는 이유',
  '표현하지 못한 감정',
];

/* ── 14일 중복 방지용 Redis 헬퍼 ── */
async function getRecentCards() {
  const raw = await redis.get('tarot:recent_cards');
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

async function recordCard(card) {
  let recent = await getRecentCards();
  const today = new Date().toISOString().slice(0, 10);
  recent = recent.filter(r => {
    const d = new Date(r.date);
    const diff = (new Date() - d) / 86400000;
    return diff < 14;
  });
  recent.push({ card, date: today });
  await redis.set('tarot:recent_cards', recent, { ex: 86400 * 16 });
}

async function pickCard() {
  const recent = await getRecentCards();
  const usedCards = recent.map(r => r.card);
  const available = TAROT_CARDS.filter(c => !usedCards.includes(c));
  const pool = available.length > 0 ? available : TAROT_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── CTA 순환 (3게시글 중 1회만 프로필 안내) ── */
async function shouldShowCta() {
  const count = parseInt(await redis.get('tarot:post_count') || '0');
  await redis.set('tarot:post_count', String(count + 1), { ex: 86400 * 30 });
  return count % 3 === 0;
}

/* ── 주제 순환 ── */
function pickTopic(topics) {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return topics[dayOfYear % topics.length];
}

/* ──────────────────────────────────────
   오전: 오늘 나에게 필요한 한마디
   180~300자, 카드 이름 미노출
────────────────────────────────────── */
async function generateMorning(card, showCta) {
  const prompt = `당신은 타로를 바탕으로 오전 생활형 리딩을 쓰는 작가입니다.

내부 참고 카드: "${card}" (게시글에 카드 이름·번호·정역방향·상징 설명 절대 노출 금지)

[이 리딩의 목적]
읽은 사람이 즉시 다음 세 가지를 이해해야 합니다.
1. 오늘 어떤 상황에서 이 리딩을 떠올려야 하는지
2. 오늘 무엇을 주의하거나 다르게 선택해야 하는지
3. 지금 바로 무엇을 해볼 수 있는지

[구성 — 3개 문단, 문단당 1~3문장]

문단 1 — 구체적인 상황형 첫 문장
사용자가 오늘 실제로 겪을 수 있는 장면으로 시작하세요.
운세 선언이나 막연한 감정 질문이 아니라 일·관계·돈·선택 중 하나의 실제 상황을 짚으세요.

좋은 첫 문장 방향 (그대로 쓰지 말고 카드에 맞게 변형):
- "혼자 정리하려던 일이 있다면 오늘은 한 사람에게 먼저 말을 꺼내보세요."
- "해야 할 일이 많은데 무엇부터 시작할지 막막하다면, 오전에는 한 가지만 정하세요."
- "결과가 늦어져 방향까지 의심하고 있다면, 오늘은 새 일을 추가하지 않는 편이 좋습니다."
- "누군가의 부탁을 거절하지 못해 내 일정이 밀리고 있다면 오늘은 순서를 바꿔야 해요."
- "답장을 기다리느라 다른 일까지 손에 잡히지 않는다면 오늘은 확인 횟수부터 줄여보세요."

문단 2 — 오늘의 판단 기준
무엇을 먼저 할지, 무엇을 하지 말아야 할지, 어떤 기준으로 선택해야 할지를 구체적으로 제시하세요.
"함께라는 것 자체가 힘이 됩니다" 같은 추상적 위로 금지.
좋은 방향: "완성된 계획을 보여주려고 미루기보다, 막힌 지점만 먼저 공유하는 편이 해결이 빠릅니다."

문단 3 — 오늘 바로 실행할 행동 하나
5~30분 안에 시작 가능하고 결과가 아닌 행동을 제안하세요.
좋은 예: "오전 중 가장 미뤄둔 일 하나를 20분만 시작해보세요." / "결정하기 전에 비용·시간·책임 조건을 한 번 적어보세요."
나쁜 예: "긍정적으로 생각하세요." / "자신을 믿으세요." / "오늘을 즐겨보세요."

[카드 의미 번역 — 생활 언어로 변환]
카드의 에너지를 다음 중 하나로 번역하세요:
관계에서의 태도 / 일의 우선순위 / 선택 전 확인 조건 / 소비와 결정 주의점 / 감정과 사실 구분 기준 / 미루거나 서두르지 말아야 할 일 / 도움 요청 또는 경계 설정 순간

[절대 사용 금지 도입]
"오늘은 좋은 일이 생길 수 있는 날입니다." / "예상치 못한 기쁨이 찾아올 수 있어요." / "요즘 많이 힘드셨나요?" / "이 글을 보게 된 것은 우연이 아닙니다." / "운이 좋습니다." / "행운이 다가옵니다." / "귀인이 나타납니다." / "잠시 멈추고 돌아보세요."
'오늘은 ○○한 날입니다' 구조 금지.

[절대 금지 — 전체]
- 카드 이름·번호·정역방향 노출
- 미래 사건 확정 (연락이 옵니다, 돈이 들어옵니다, 기회가 생깁니다)
- 해시태그
- 이모지
- 댓글·팔로우·프로필 홍보
- 같은 뜻 반복
- 타로 전문용어

[분량] 공백 포함 220~270자 (180 미만·300 초과 시 재생성)

반드시 아래 JSON 형식으로만 출력 (다른 텍스트 없이):
{"slot":"morning","topic":"실제 생활 주제","card":"${card}","mainPost":"완성된 게시물","firstReply":null,"ctaType":"none","duplicateCheck":{"recentCard":false,"recentTopic":false,"recentOpening":false,"recentConclusion":false,"recentAction":false}}`;

  return await callAI(prompt);
}

/* ──────────────────────────────────────
   오후: 1·2·3 선택형 타로
   결과를 mainPost에 포함, firstReply: null
   350~600자
────────────────────────────────────── */
async function generateChoice() {
  const topic = pickTopic(CHOICE_TOPICS);

  // 1·2·3 각각 독립된 카드 3장 선택
  const recent = await getRecentCards();
  const usedCards = recent.map(r => r.card);
  const pool = TAROT_CARDS.filter(c => !usedCards.includes(c));
  const available = pool.length >= 3 ? pool : TAROT_CARDS;
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const [c1, c2, c3] = shuffled.slice(0, 3);

  const prompt = `당신은 타로 선택형 콘텐츠를 쓰는 작가입니다.

내부 참고 카드 (게시글에 카드 이름·번호·정역방향 절대 노출 금지):
1번: "${c1}"
2번: "${c2}"
3번: "${c3}"

오늘 주제: "${topic}"

[본문 구성 — 반드시 이 순서. 실제 줄바꿈만 사용. ### ## --- === 등 기호 절대 금지]

1. 구체적인 질문형 후킹 (1~2문장)
주제를 바로 알 수 있는 실제 상황으로 시작하세요.
좋은 방향: "기다리는 연락이 있다면, 지금 먼저 움직여야 할까요?" / "계속할지 그만둘지 고민하는 일이 있나요?"
피할 표현: "오늘 당신에게 필요한 메시지가 도착했습니다." / "이 글을 본 것은 우연이 아닙니다."

2. 떠올릴 사람이나 상황 안내 (1문장)
짧고 명확하게. 금지: 눈을 감으라는 지시, 심호흡 의식, 반드시 맞는다는 보장

3. 숫자 선택 안내 (1문장)
예: "1 · 2 · 3 중 가장 먼저 눈에 들어온 숫자를 골라주세요."

4. 빈 줄

5. 숫자별 결과 — 1·2·3 모두 반드시 포함, 순서대로, 각 1~2문장
1 — (카드 "${c1}" 에너지 기반, 주제와 연결, 현재 흐름 또는 놓친 지점 + 행동 기준)
2 — (카드 "${c2}" 에너지 기반, 1번과 다른 방향)
3 — (카드 "${c3}" 에너지 기반, 1·2번과 다른 방향)

결과 작성 규칙:
- 세 결과는 서로 다른 상황과 행동 방향 제시 (긍정·보통·부정 등급 절대 금지)
- 어느 번호도 무조건 좋거나 나쁜 결과로 만들지 마세요
- 미래 사건 확정 금지: "연락이 옵니다" "해결됩니다" "상대가 결정하고 있습니다"
- 대신: 확인할 기준, 관찰할 흐름, 지금 취할 행동 제시
- 카드 이름 절대 노출 금지

6. 마지막 CTA (1문장)
숫자 댓글 하나만 요청. 예: "어떤 숫자를 골랐나요? 번호 하나만 댓글로 남겨주세요."

[절대 금지]
- 카드 이름·번호·정역방향 노출
- ### ## --- === 마크다운 기호
- 해시태그
- 이모지 2개 이상
- 3번 결과 누락
- firstReply 사용
- 프로필·사이트 CTA
- 댓글 외 추가 행동 요구

[분량] 전체 500~700자

반드시 아래 JSON 형식으로만 출력 (다른 텍스트 없이):
{"slot":"choice","topic":"${topic}","cards":{"choice1Card":"${c1}","choice2Card":"${c2}","choice3Card":"${c3}"},"mainPost":"완성된 게시물","firstReply":null,"ctaType":"comment","validation":{"hasChoice1":true,"hasChoice2":true,"hasChoice3":true,"uniqueCards":true,"withinCharacterLimit":true,"noInternalDelimiter":true,"noFutureCertainty":true,"recentDuplicate":false}}`;

  const parsed = await callAI(prompt);

  // 3번 결과 누락 검사
  const post = parsed.mainPost || '';
  const has1 = /1\s*[—–-]/.test(post);
  const has2 = /2\s*[—–-]/.test(post);
  const has3 = /3\s*[—–-]/.test(post);
  if (!has1 || !has2 || !has3) {
    throw new Error(`선택형 결과 누락: 1=${has1} 2=${has2} 3=${has3}`);
  }

  // 내부 구분 기호 제거
  parsed.mainPost = post
    .replace(/^#{1,3}\s*/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/^===.*===$/gm, '');

  return parsed;
}

/* ──────────────────────────────────────
   저녁: 마음과 관계 리딩
   300~450자
────────────────────────────────────── */
async function generateEvening(card, showCta) {
  const topic = pickTopic(EVENING_TOPICS);

  // 관계 유형 순환
  const relTypes = ['love','marriage','family','friend','work'];
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0))/86400000);
  const relationshipType = relTypes[dayOfYear % relTypes.length];

  const prompt = `당신은 저녁 관계 리딩을 쓰는 작가입니다.

내부 참고 카드: "${card}" (게시글에 카드 이름·번호·정역방향·상징 설명 절대 노출 금지)
오늘 관계 유형: ${relationshipType} (love=연애·썸, marriage=부부·장기관계, family=가족, friend=친구, work=직장·사회적관계)
오늘 주제: "${topic}"

[본문 구성 — 반드시 이 순서. 실제 줄바꿈만 사용. ### ## --- === 등 기호 절대 금지]

문단 1 — 구체적인 관계 상황형 첫 문장
주제와 관계 유형에 맞는 실제 장면으로 시작하세요.
좋은 방향:
"예전보다 연락이 줄어든 사람 때문에 내가 뭔가 잘못했나 되짚고 있나요?"
"상대의 말은 그대로인데 행동이 달라져 더 혼란스럽다면 읽어보세요."
"나만 먼저 연락하고 약속을 잡는 관계에 지쳤다면 오늘은 이 부분을 확인해보세요."
"사과는 받았지만 같은 행동이 반복돼 믿어도 될지 고민되나요?"
금지: "밤마다 그 사람을 생각하나요?" / "그 사람의 속마음이 궁금한가요?" / "이 글을 본 것은 우연이 아닙니다."

문단 2 — 현재 흐름과 실제 판단 기준 (1~2문장)
사용자가 실제로 관찰할 수 있는 기준을 1~2개 제시하세요.
활용 가능한 기준: 연락 횟수보다 답변의 성의 / 약속을 말하는지보다 날짜를 정하는지 / 사과 후 행동이 달라졌는지 / 말과 행동이 일치하는지 / 갈등 후 대화를 다시 시도하는지
금지: 상대의 현재 감정이나 생각을 사실처럼 확정
좋은 예: "연락이 줄었다는 사실만으로 마음이 끝났다고 단정할 수는 없어요. 다만 약속을 잡으려는 노력까지 함께 줄었다면 우선순위가 달라졌을 가능성도 살펴봐야 합니다."

문단 3 — 오늘 취할 행동 또는 피할 반응 (1문장)
작고 구체적인 행동 하나. 5~30분 안에 실행 가능하게.
좋은 예: "오늘은 추가 연락 전에 내가 마지막으로 보낸 메시지와 상대의 행동을 다시 확인해보세요."
나쁜 예: "자신을 사랑하세요." / "상대를 믿어주세요." / "마음을 내려놓으세요." / "기다리면 답이 옵니다."

문단 4 — 짧은 참여 질문 (1문장)
반드시 번호·양자택일·한 단어로 답할 수 있어야 합니다.
좋은 예: "지금 가까운 쪽은? ① 연락만 줄었다 ② 태도도 달라졌다"
좋은 예: "내가 더 자주 하는 쪽은? 먼저 연락한다 / 기다린다"
좋은 예: "상대의 말과 행동이 같나요? 예 / 아니오"
금지: "지금 당신의 마음은 어떤가요?" / "무엇을 내려놓고 싶나요?" / 긴 사연을 요구하는 질문 / 문법이 어색한 질문
질문이 앞 문단의 상황과 직접 연결되어야 합니다.${showCta ? `

마지막 한 줄 — 프로필 CTA (자연스럽게)
"내 상황에 맞는 카드가 더 궁금하다면 프로필에서 무료로 한 장 확인해볼 수 있어요."` : ''}

[절대 금지]
- 카드 이름·번호·정역방향 노출
- 상대 마음 확정: "상대도 혼란스럽습니다" "상대는 아직 당신을 좋아합니다" "곧 연락이 옵니다"
- ### ## --- === 마크다운·구분 기호
- 해시태그
- 이모지 2개 이상
- 감정 과장: "밤마다 생각하나요?" "잠 못 이루며 기다리나요?"
- 관계 유지·이별·재회 단정
- '나를 챙기세요' 추상 결론 (구체 행동으로 대체)
- 문법·의미가 깨진 문장

[분량] 전체 350~500자

반드시 아래 JSON 형식으로만 출력 (다른 텍스트 없이):
{"slot":"evening","topic":"${topic}","relationshipType":"${relationshipType}","card":"${card}","mainPost":"완성된 게시물","firstReply":null,"ctaType":"${showCta ? 'profile' : 'comment'}","validation":{"specificSituation":true,"noMindReading":true,"hasObservableSignal":true,"hasConcreteAction":true,"shortAnswerQuestion":true,"grammarValid":true,"withinCharacterLimit":true,"noInternalDelimiter":true,"recentDuplicate":false}}`;

  const parsed = await callAI(prompt);

  // 내부 구분 기호 제거
  if (parsed.mainPost) {
    parsed.mainPost = parsed.mainPost
      .replace(/^#{1,3}\s*/gm, '')
      .replace(/^---+$/gm, '')
      .replace(/^===.*===$/gm, '');
  }

  return parsed;
}

/* ── Claude API 호출 ── */
async function callAI(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (!data.content?.[0]?.text) throw new Error(`AI 응답 오류: ${JSON.stringify(data)}`);
  const text = data.content[0].text;
  // JSON 블록만 추출 (코드펜스, 앞뒤 텍스트 제거)
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`JSON 추출 실패: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

/* ── Threads 게시 ── */
async function postToThreads(text) {
  const token = process.env.THREADS_ACCESS_TOKEN;

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
  const publishData = await publishRes.json();
  if (!publishData.id) throw new Error(`게시 실패: ${JSON.stringify(publishData)}`);
  return publishData.id;
}

/* ── 슬롯 결정 ── */
function getSlot(hour) {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'choice';
  return 'evening';
}

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const hour = parseInt(
      new Date().toLocaleString('ko-KR', { hour: 'numeric', hour12: false, timeZone: 'Asia/Seoul' })
    );
    const slot = req.query.slot || getSlot(hour);
    const isDry = req.query.dry === 'true';

    const card = await pickCard();
    const showCta = await shouldShowCta();

    let parsed;
    if (slot === 'morning') {
      parsed = await generateMorning(card, showCta);
    } else if (slot === 'choice') {
      parsed = await generateChoice();
    } else {
      parsed = await generateEvening(card, showCta);
    }

    const mainPost = parsed.mainPost;

    if (isDry) {
      return res.status(200).json({ dry_run: true, ...parsed });
    }

    const threadId = await postToThreads(mainPost);
    await recordCard(card);

    return res.status(200).json({
      success: true,
      slot,
      card,
      threads_id: threadId,
      ctaType: parsed.ctaType,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
