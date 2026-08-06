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
  return raw ? JSON.parse(raw) : [];
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
  await redis.set('tarot:recent_cards', JSON.stringify(recent), { ex: 86400 * 16 });
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
  const prompt = `당신은 타로를 바탕으로 오늘 하루를 준비하는 짧은 메시지를 쓰는 작가입니다.

오늘 카드: "${card}" (내부 참고용, 게시글에 카드 이름 절대 노출 금지)

[오전 메시지 구성 — 순서대로]
1. 오늘 겪을 법한 구체적인 상황 한 문장
2. 가장 중요한 메시지 한 문장 (카드 의미를 생활 언어로)
3. 오늘 바로 실행할 수 있는 작은 행동 한 가지

[예시 방향 — 그대로 쓰지 말고 카드에 맞게 변형]
"오늘은 새로운 일을 더 벌이는 것보다 이미 시작한 한 가지를 끝내는 편이 좋아요. 답이 늦다고 방향까지 틀린 것은 아닙니다. 오전 중 가장 미뤄둔 일 하나를 20분만 먼저 해보세요."

[절대 금지]
- 카드 이름 언급
- "힘내세요" "잘 될 거예요" 등 막연한 위로
- 카드 상징 설명
- 연애 이야기
- 댓글 요청
- 해시태그
- 이모지${showCta ? `

[마지막 한 줄 CTA 추가 — 자연스럽게]
"내 상황에 맞는 카드가 궁금하다면 프로필에서 무료로 한 장 확인해보세요."` : ''}

[분량] 공백 포함 180~300자 (CTA 제외)

반드시 아래 JSON 형식으로만 출력:
{"slot":"morning","topic":"게시글의 실제 주제","card":"${card}","mainPost":"완성된 게시물","firstReply":null,"ctaType":"${showCta ? 'profile' : 'none'}","duplicateCheck":{"recentCard":false,"recentTopic":false,"recentOpening":false,"recentConclusion":false}}`;

  return await callAI(prompt);
}

/* ──────────────────────────────────────
   오후: 1·2·3 선택형 타로
   결과를 mainPost에 포함, firstReply: null
   350~600자
────────────────────────────────────── */
async function generateChoice(card) {
  const topic = pickTopic(CHOICE_TOPICS);

  const prompt = `당신은 댓글 참여를 유도하는 타로 선택형 게시글 작가입니다.

오늘 카드: "${card}" (내부 참고용, 본문 첫 문장에 카드 이름 노출 금지)
오늘 주제: "${topic}"

[본문 구성 — 순서대로]
1. 주제와 연결된 구체적인 상황 후킹 (1~2문장)
2. 잠시 한 사람이나 상황을 떠올리라는 안내 (1문장)
3. "1 · 2 · 3 중 가장 먼저 눈에 들어온 숫자를 댓글로 남겨주세요." (고정 문장으로 유지, 변형 가능)
4. 한 줄 공백
5. 숫자별 결과 (같은 본문 안에 포함):
   1 — 핵심 해석 2~3문장
   2 — 핵심 해석 2~3문장
   3 — 핵심 해석 2~3문장

[결과 작성 규칙]
- 세 결과를 긍정·보통·부정으로 나누지 마세요
- 각 결과는 서로 다른 상황과 다른 행동 방향을 제시하세요
- 상대방 마음을 확정하지 마세요

[금지]
- 첫 문장에 카드 이름 노출
- 해시태그
- 이모지 2개 이상
- firstReply로 결과 분리 (결과는 반드시 mainPost 안에)
- 프로필 CTA (오후 선택형에는 넣지 않음)
- 댓글 외 추가 행동 요구

[분량] 공백 포함 350~600자

반드시 아래 JSON 형식으로만 출력:
{"slot":"choice","topic":"${topic}","card":"${card}","mainPost":"완성된 게시물","firstReply":null,"ctaType":"comment","duplicateCheck":{"recentCard":false,"recentTopic":false,"recentOpening":false,"recentConclusion":false}}`;

  return await callAI(prompt);
}

/* ──────────────────────────────────────
   저녁: 마음과 관계 리딩
   300~450자
────────────────────────────────────── */
async function generateEvening(card, showCta) {
  const topic = pickTopic(EVENING_TOPICS);

  const prompt = `당신은 저녁에 관계와 감정을 다루는 공감형 타로 리더입니다.

오늘 카드: "${card}" (내부 참고용, 본문 중심에 카드 이름 두지 마세요)
오늘 주제: "${topic}"

[저녁 메시지 구성 — 순서대로]
1. 주제 상황을 바로 언급하는 첫 문장 (독자가 해당된다고 느낄 구체적 장면)
2. 현재 관계의 핵심 흐름 (1~2문장)
3. 상대의 마음을 단정하지 않는 가능한 해석 (1~2문장)
4. 지금 취할 행동 또는 피할 반응 (1문장)
5. 한 단어나 짧은 선택지로 답할 수 있는 참여 질문 (1문장)

[첫 문장 예시 — 그대로 쓰지 말고 주제에 맞게 변형]
"연락은 없는데 끝났다는 느낌도 들지 않는 사람이 있나요?"
"상대의 말보다 달라진 행동이 더 신경 쓰인다면 읽어보세요."
"나만 계속 관계를 붙잡고 있다는 생각이 든다면 오늘은 이 부분을 보세요."

[참여 질문 형식]
숫자나 한 단어로 답할 수 있게 하세요:
예: "먼저 연락한다 / 기다린다", "보고 싶다 / 서운하다 / 모르겠다", "예 / 아니오"

[금지]
- 상대방 마음 확정
- 재회·연락·호감으로만 해석
- 카드 상징 설명
- 해시태그
- 이모지 2개 이상${showCta ? `

[마지막 CTA 추가]
"내 상황에 맞는 카드가 더 궁금하다면 프로필에서 무료로 한 장 확인해볼 수 있어요."` : ''}

[분량] 공백 포함 300~450자 (CTA 제외)

반드시 아래 JSON 형식으로만 출력:
{"slot":"evening","topic":"${topic}","card":"${card}","mainPost":"완성된 게시물","firstReply":null,"ctaType":"${showCta ? 'profile' : 'comment'}","duplicateCheck":{"recentCard":false,"recentTopic":false,"recentOpening":false,"recentConclusion":false}}`;

  return await callAI(prompt);
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
      parsed = await generateChoice(card);
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
