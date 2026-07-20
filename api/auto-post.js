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

  const prompt = `오늘(${today})의 타로 카드는 "${card}"입니다.

Threads 게시물을 작성해주세요. 다음 조건을 반드시 지켜주세요:

1. 500자 이내
2. 첫 줄은 오늘의 카드 제목 (이모지 포함)
3. 카드가 전하는 오늘의 메시지 (2-3문장, 따뜻하고 공감적인 말투)
4. 연애/직업/돈 중 오늘 이 카드와 가장 관련 있는 주제 한 가지만 짧게
5. 마지막에 "더 깊은 리딩이 궁금하다면 → 링크 클릭" 이런 식으로 자연스럽게 유도
6. 해시태그 5개 이내 (#타로 #오늘의카드 #타로리딩 포함)

광고처럼 느껴지면 안 되고, 진짜 타로이스트가 팔로워에게 전하는 메시지처럼 써주세요.`;

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
