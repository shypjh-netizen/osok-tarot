const USER_ID = '27956402803984502';

const TAROT_CARDS = [
  '바보', '마법사', '여사제', '황후', '황제', '교황', '연인', '전차',
  '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 사람', '죽음',
  '절제', '악마', '탑', '별', '달', '태양', '심판', '세계',
  '완드 에이스', '완드 2', '완드 3', '완드 킹', '컵 에이스', '컵 2',
  '컵 3', '컵 퀸', '펜타클 에이스', '펜타클 4', '펜타클 10', '소드 에이스',
  '소드 2', '소드 6', '소드 퀸'
];

async function generateContent(card) {
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'Asia/Seoul'
  });

  const themes = [
    { target: '요즘 결정을 못 내리고 있는 분', topic: '선택과 방향' },
    { target: '열심히 하는데 뭔가 안 풀리는 분', topic: '흐름과 타이밍' },
    { target: '관계 때문에 지쳐있는 분', topic: '인간관계' },
    { target: '돈 걱정이 끊이지 않는 분', topic: '재물운' },
    { target: '이 일이 맞는 건지 모르겠는 분', topic: '직업과 커리어' },
    { target: '누군가에게 상처받은 분', topic: '감정과 치유' },
    { target: '뭔가 변화가 필요한 것 같은 분', topic: '변화와 새로운 시작' },
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const prompt = `오늘의 타로 카드는 "${card}"입니다.
오늘 타겟: "${theme.target}"
주제: "${theme.topic}"

Threads 게시물을 써주세요. 아래 구조를 따르세요:

[첫 줄 - 훅]
타겟 독자가 "어? 나 얘기인데?" 싶게 만드는 한 줄. 질문이나 공감형으로 시작. 이모지 1개.
예시: "요즘 결정을 못 내리고 계속 미루고 있나요? 🌀"

[본문 - 카드 메시지]
카드가 그 사람에게 전하는 말. 2-3문장. 다 알려주지 말고 핵심 키워드만 흘리기.
따뜻하지만 구체적으로. 마크다운 기호(**) 절대 금지.

[댓글 유도]
"지금 어떤 상황인지 댓글로 알려주세요" 또는 "이 카드 공감되면 댓글 남겨요" 같이 자연스럽게.

[CTA]
"내 카드 직접 뽑아보기 → https://osok-tarot.vercel.app"

[해시태그]
#타로 #오늘의카드 #타로리딩 포함해서 4개 이내

전체 300자 이내. 광고 느낌 금지. 진짜 타로이스트가 팔로워에게 보내는 메시지처럼.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content[0].text;
}

async function postToThreads(text) {
  const token = process.env.THREADS_ACCESS_TOKEN;

  // 1단계: 미디어 컨테이너 생성
  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${USER_ID}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: text,
        access_token: token,
      }),
    }
  );

  const createData = await createRes.json();
  if (!createData.id) throw new Error(`Container 생성 실패: ${JSON.stringify(createData)}`);

  // 2단계: 30초 대기 (Threads 권장)
  await new Promise(r => setTimeout(r, 30000));

  // 3단계: 게시
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${USER_ID}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: token,
      }),
    }
  );

  const publishData = await publishRes.json();
  return publishData;
}

export default async function handler(req, res) {
  // cron secret으로 보호
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 오늘 날짜 기반으로 카드 선택 (매일 다른 카드)
    const dayOfYear = Math.floor(
      (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
    );
    const card = TAROT_CARDS[dayOfYear % TAROT_CARDS.length];

    const content = await generateContent(card);
    const isDry = req.query.dry === 'true';

    if (isDry) {
      return res.status(200).json({ dry_run: true, card, content });
    }

    const result = await postToThreads(content);

    return res.status(200).json({
      success: true,
      card,
      content,
      threads_id: result.id
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
