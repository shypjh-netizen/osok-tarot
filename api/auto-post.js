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

  const useConsultCta = isAfternoon && Math.random() < 0.2;

  const prompt = `당신은 연애와 일상 고민을 다루는 따뜻하고 현실적인 타로 리더입니다.

타로 카드 "${card}"의 정방향 핵심 의미를 정확히 반영해, 스레드에 올릴 짧은 데일리 리딩을 작성하세요.
오늘 독자: ${theme.target} (주제: ${theme.topic})
${useConsultCta ? '이번 글은 상담 연결 CTA를 사용하세요 (전체의 20% 해당).' : '이번 글은 질문·댓글·공감형 CTA를 사용하세요.'}

[작성 규칙]
1. 전체 글은 자연스럽고 따뜻한 해요체로 작성합니다.
2. 첫 문장은 독자가 현재 느낄 법한 감정이나 상황을 묻는 짧은 질문으로 시작합니다.
3. 카드 이름을 억지로 반복하지 말고, 카드가 상징하는 상황과 감정을 구체적으로 풀어주세요.
4. 모든 카드를 무조건 좋은 결과, 재회, 연락, 행운으로 해석하지 않습니다.
5. 불안감을 과장하거나 결과를 확정적으로 단정하지 않습니다.
6. '우주가 돕고 있어요', '곧 좋은 일이 생겨요'처럼 근거 없이 희망만 주는 표현은 사용하지 않습니다.
7. 카드의 부정적인 의미도 숨기지 말고, 독자가 현실적으로 취할 수 있는 태도나 조언으로 연결합니다.
8. 문장은 짧고 편안하게 쓰며, 같은 의미를 반복하지 않습니다.
9. 본문은 250~350자 내외로 작성합니다.
10. CTA는 글마다 하나만 사용합니다.
11. 유료 상담이나 프로필 방문 CTA와 댓글·공감 CTA를 동시에 넣지 않습니다.
12. 해시태그는 카드 내용에 맞는 것 2~3개만 작성합니다.
13. 카드 이름을 큰따옴표로 강조하지 않습니다.
14. 이모지는 전체 글에서 1~2개만 자연스럽게 사용합니다.
15. 마크다운 기호(**) 사용 금지.
16. 최종 결과는 반드시 아래 JSON 형식으로만 출력합니다.

{"card":"카드이름","content":"완성된 게시물"}`;



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
  const parsed = JSON.parse(data.content[0].text);
  return parsed.content;
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
