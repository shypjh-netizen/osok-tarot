const USER_ID = '27956402803984502';

const TAROT_CARDS = [
  '바보', '마법사', '여사제', '황후', '황제', '교황', '연인', '전차',
  '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 사람', '죽음',
  '절제', '악마', '탑', '별', '달', '태양', '심판', '세계',
  '완드 에이스', '완드 2', '완드 3', '완드 킹', '컵 에이스', '컵 2',
  '컵 3', '컵 퀸', '펜타클 에이스', '펜타클 4', '펜타클 10', '소드 에이스',
  '소드 2', '소드 6', '소드 퀸'
];

async function generateContent(card, isAfternoon) {
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'Asia/Seoul'
  });

  const themes = [
    {
      target: '요즘 결정을 못 내리고 있는 분', topic: '선택과 방향',
      ctas: [
        '오늘 카드가 마음에 닿았다면 ❤️ 하나 남겨주세요.',
        '오늘 카드가 얼마나 와닿았는지 1부터 5까지 알려주세요.',
        '오늘 하루를 보내며 이 카드의 메시지를 한 번 떠올려보세요.',
      ]
    },
    {
      target: '열심히 하는데 뭔가 안 풀리는 분', topic: '흐름과 타이밍',
      ctas: [
        '오늘 카드가 마음에 닿았다면 ❤️ 하나 남겨주세요.',
        '오늘 카드가 얼마나 와닿았는지 1부터 5까지 알려주세요.',
        '다음 카드의 메시지도 궁금하다면 조용히 따라와 주세요.',
      ]
    },
    {
      target: '관계 때문에 지쳐있는 분', topic: '인간관계',
      ctas: [
        '이 카드를 보자마자 떠오른 사람이 있나요?',
        '지금 떠오르는 사람이 있다면 이니셜만 살짝 남겨주세요.',
        '그 사람에게 가장 듣고 싶은 말은 무엇인가요?',
        '기다리는 연락이 있다면 📩 하나 남겨주세요.',
      ]
    },
    {
      target: '연락이 올지 안 올지 기다리는 분', topic: '연애와 연락운',
      ctas: [
        '기다리는 연락이 있다면 📩 하나 남겨주세요.',
        '지금 떠오르는 사람이 있다면 이니셜만 살짝 남겨주세요.',
        '그 사람도 같은 마음일지 궁금하다면 ❤️ 하나 남겨주세요.',
        '지금 궁금한 것은 그 사람의 속마음인가요, 연락운인가요?',
      ]
    },
    {
      target: '돈 걱정이 끊이지 않는 분', topic: '재물운',
      ctas: [
        '오늘 카드가 마음에 닿았다면 ❤️ 하나 남겨주세요.',
        '오늘 카드가 얼마나 와닿았는지 1부터 5까지 알려주세요.',
        '나중에 다시 확인하고 싶다면 이 글을 저장해두세요.',
      ]
    },
    {
      target: '이 일이 맞는 건지 모르겠는 분', topic: '직업과 커리어',
      ctas: [
        '오늘 카드가 얼마나 와닿았는지 1부터 5까지 알려주세요.',
        '오늘 하루를 보내며 이 카드의 메시지를 한 번 떠올려보세요.',
        '다음 카드의 메시지도 궁금하다면 조용히 따라와 주세요.',
      ]
    },
    {
      target: '누군가에게 상처받은 분', topic: '감정과 치유',
      ctas: [
        '오늘 이 카드가 필요했던 분은 조용히 ❤️만 남겨도 좋아요.',
        '지금 마음에 남은 문장이 있다면 댓글로 적어주세요.',
        '이 카드를 보자마자 떠오른 사람이 있나요?',
      ]
    },
    {
      target: '뭔가 변화가 필요한 것 같은 분', topic: '변화와 새로운 시작',
      ctas: [
        '다음 카드의 메시지도 궁금하다면 조용히 따라와 주세요.',
        '오늘 카드가 마음에 닿았다면 ❤️ 하나 남겨주세요.',
        '나중에 다시 확인하고 싶다면 이 글을 저장해두세요.',
      ]
    },
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const cta = theme.ctas[Math.floor(Math.random() * theme.ctas.length)];

  const afternoonCta = isAfternoon ? [
    '혼자서는 관계의 흐름이 잘 보이지 않을 때, 프로필에서 더 깊은 리딩을 만나볼 수 있어요.',
    '그 사람의 마음을 조금 더 깊이 알고 싶다면 프로필을 확인해 주세요.',
    '내 상황에 맞는 리딩이 필요하다면 프로필에서 이어서 만나보세요.',
  ][Math.floor(Math.random() * 3)] : '';

  const prompt = `타로 카드 "${card}"를 바탕으로 Threads 게시물을 써주세요.

오늘 이 글을 읽을 사람: ${theme.target}
주제: ${theme.topic}

아래 예시처럼 따뜻한 해요체로 써주세요:
---
오늘은 마음을 재촉하지 않아도 괜찮아요.
상대방 역시 자신의 감정을 정리할 시간이 필요한 마음으로 보여요.
지금은 답을 확인하려 하기보다 자연스러운 흐름을 지켜보는 것도 괜찮아요.
---

규칙:
- 첫 줄은 읽는 사람이 "나 얘기인데?" 싶게. 이모지 1개. 카드 이름 언급 금지.
- 본문 2~3문장. 딱딱한 표현 금지. 마크다운(**)  금지.
- ${isAfternoon && afternoonCta ? `마지막에서 두 번째 줄: "${afternoonCta}"` : ''}
- 마지막 줄: "${cta}" (그대로 쓸 것)
- 해시태그 #타로 #타로리딩 포함 3개 이내
- 전체 250자 이내`;


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
    const hour = new Date().toLocaleString('ko-KR', { hour: 'numeric', hour12: false, timeZone: 'Asia/Seoul' });
    const isAfternoon = parseInt(hour) >= 12;

    const content = await generateContent(card, isAfternoon);
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
