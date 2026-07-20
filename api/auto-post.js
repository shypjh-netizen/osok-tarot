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

[첫 줄 - 운명적 훅]
"이 글이 보였다면 우연이 아니에요" 같은 느낌으로 시작. 읽는 사람이 나한테 하는 말인가? 싶게.
카드 이름은 절대 첫 줄에 쓰지 말 것. 이모지 1개.
예시: "지금 이 글이 눈에 들어왔다면, 당신한테 필요한 메시지예요 🌙"

[본문 - 메시지]
카드의 에너지를 바탕으로, 타겟 독자의 상황에 딱 맞는 말. 2문장.
카드 이름 언급 안 해도 됨. 구체적이고 따뜻하게. 마크다운 기호(**) 절대 금지.

[여운 + 댓글 유도]
짧게 여운 남기고 "공감되면 댓글로 나눠줄게요" 또는 "어떤 상황인지 댓글에 남겨주시면 같이 봐줄게요" 자연스럽게.

[CTA + 댓글 유도 - 마지막 2줄]
CTA: "프로필 링크에서 지금 바로 카드 뽑아보세요" 느낌으로. 기다림 없이 즉시 리딩 가능하다는 걸 자연스럽게 전달.
댓글 유도: 친근한 존댓말로. "댓글 달아 주세요", "이야기해 주세요", "알려 주세요" 같은 자연스러운 말투.
억지스럽거나 광고 느낌 나면 절대 안 됨. 매번 다르게.

[해시태그]
#타로 #타로리딩 포함해서 3개 이내

전체 280자 이내. 광고 느낌 절대 금지. 신비롭고 따뜻한 타로이스트의 메시지처럼.`;

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
