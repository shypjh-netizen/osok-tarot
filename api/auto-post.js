const USER_ID = '27956402803984502';

const TAROT_CARDS = [
  '바보', '마법사', '여사제', '황후', '황제', '교황', '연인', '전차',
  '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 사람', '죽음',
  '절제', '악마', '탑', '별', '달', '태양', '심판', '세계',
  '완드 에이스', '완드 2', '완드 3', '완드 킹', '컵 에이스', '컵 2',
  '컵 3', '컵 퀸', '펜타클 에이스', '펜타클 4', '펜타클 10', '소드 에이스',
  '소드 2', '소드 6', '소드 퀸'
];

async function generateContent(card, isEvening) {
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

  const useConsultCta = Math.random() < 0.2;
  const postingPeriod = isEvening ? 'evening' : 'morning';

  const prompt = `당신은 연애와 일상 고민을 다루는 따뜻하고 현실적인 타로 리더입니다.

타로 카드 "${card}"의 정방향 핵심 의미를 정확히 반영해, 스레드에 올릴 데일리 리딩을 작성하세요.
posting_period: ${postingPeriod}
${useConsultCta ? '이번 글은 상담 및 프로필 방문 CTA를 사용하세요 (전체의 20% 해당).' : '이번 글은 질문·공감형 CTA를 사용하세요.'}

${postingPeriod === 'morning' ? `■ 오전 8시 30분 — 오늘의 흐름
- 하루를 시작하는 독자에게 지금 필요한 메시지를 전합니다.
- 오늘의 전반적인 흐름, 감정 상태, 현실적인 조언, 주의할 점을 중심으로 리딩합니다.
- 독자가 오늘 실천할 수 있는 작고 구체적인 행동을 한 가지 제안해도 좋습니다.
- 연애나 상대방의 속마음으로만 해석하지 않습니다.
- 밝고 차분하며 부담 없이 하루를 시작할 수 있는 분위기로 작성합니다.
- 지나치게 무겁거나 불안감을 유발하는 표현은 피합니다.
- 부정적인 카드가 나오더라도 오늘 조심하거나 점검할 부분으로 현실적으로 안내합니다.

리딩 구성:
1문단: 독자가 오늘 느낄 수 있는 감정이나 상황을 짧게 묻습니다.
2문단: 카드가 보여주는 오늘의 핵심 흐름을 설명합니다.
3문단: 오늘 실천하거나 주의하면 좋은 현실적인 조언을 전합니다.
CTA: 오늘의 행동이나 마음가짐과 연결된 짧은 질문으로 마무리합니다.
예시 CTA: "오늘 가장 먼저 정리하고 싶은 것은 무엇인가요?" / "오늘 내려놓아야 할 부담이 있나요?" / "오늘 꼭 지키고 싶은 한 가지가 있나요?"` :

`■ 오후 8시 30분 — 마음과 관계
- 하루를 마무리하며 떠오르는 사람과 자신의 감정을 중심으로 리딩합니다.
- 연애, 상대방의 속마음, 관계의 흐름, 연락, 거리감, 미련, 기다림 등의 주제를 카드 의미에 맞게 다룹니다.
- 모든 카드를 재회, 연락, 호감 또는 새로운 만남으로 해석하지 않습니다.
- 상대방의 마음을 확정하거나 특정 행동이 반드시 일어난다고 단정하지 않습니다.
- 독자의 불안감을 자극하거나 상대방의 행동을 기다리게 만드는 표현은 사용하지 않습니다.
- 상대방의 마음뿐 아니라 독자 자신의 감정과 관계에서 필요한 태도도 함께 살펴봅니다.
- 조용히 자신의 마음을 돌아볼 수 있는 따뜻하고 감성적인 분위기로 작성합니다.

리딩 구성:
1문단: 독자의 현재 감정이나 떠오르는 관계를 짧게 묻습니다.
2문단: 카드가 보여주는 마음과 관계의 핵심 흐름을 설명합니다.
3문단: 독자가 살펴봐야 할 감정이나 관계의 태도를 전합니다.
CTA: 부담 없이 자신의 마음을 돌아볼 수 있는 짧은 질문으로 마무리합니다.
예시 CTA: "이제는 내려놓아야 할 마음이 있나요?" / "그 사람보다 내 마음을 먼저 살펴봐야 하는 건 아닐까요?" / "기다리고 있는 말이나 연락이 있나요?"`}

[공통 규칙]
- 전체 글은 부드럽고 자연스러운 해요체로 작성합니다.
- 카드의 의미를 교과서식으로 해설하지 말고, 타로 리더가 독자 한 사람에게 조용히 이야기하듯 작성합니다.
- "이 카드가 말하는 것은" 같은 해설식 표현 금지.
- 같은 핵심 단어와 의미를 한 게시물 안에서 반복하지 않습니다.
- 미래 결과, 재회, 연락, 상대방 마음을 확정적으로 단정하지 않습니다.
- "우주의 타이밍", "곧 연락이 옵니다" 같은 근거 없는 표현 금지.
- CTA는 게시물당 하나만 사용합니다.
- 참여형 CTA와 프로필 방문 CTA를 동시에 넣지 않습니다.
- 참여형 CTA는 추상적인 질문만 던지지 말고, 두 가지 선택지나 한 단어로 답할 수 있는 방식으로 작성합니다. 독자가 개인적인 사정을 설명하지 않아도 3초 안에 답할 수 있어야 합니다.
  예시: "지금 더 필요한 건 위로인가요, 용기인가요?" / "기다리는 쪽인가요, 먼저 움직이는 쪽인가요?" / "오늘 카드가 와닿았다면 ❤️ 하나만 남겨주세요."
- 이모지는 게시물당 1~2개만 사용합니다.
- 마크다운 기호(**) 사용 금지.
- 해시태그는 내용에 맞는 것 2~3개만 작성합니다.
- 전체 분량은 공백 포함 300~450자 이내로 작성합니다.
- 최종 결과는 반드시 아래 JSON 형식으로만 출력합니다.

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
  const raw = data.content[0].text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(raw);
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
    const hour = parseInt(new Date().toLocaleString('ko-KR', { hour: 'numeric', hour12: false, timeZone: 'Asia/Seoul' }));
    const isEvening = hour >= 12;

    const content = await generateContent(card, isEvening);
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
