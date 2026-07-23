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
  // CTA 유형을 날짜+시간대로 결정해 연속 반복 방지 (6종 순환)
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const ctaIndex = (dayOfYear * 2 + (isEvening ? 1 : 0)) % 6;
  // 0=선택형 1=한단어형 2=최근경험형 3=이모지공감형 4=여운형 5=프로필안내형
  const ctaTypeLabel = ['선택형','한단어형','최근경험형','이모지공감형','여운형','프로필안내형'][ctaIndex];

  const postingPeriod = isEvening ? 'evening' : 'morning';

  const prompt = `당신은 연애와 일상 고민을 다루는 따뜻하고 현실적인 타로 리더입니다.
이번 게시물은 공동 리딩이에요. 특정 개인이 아니라 오늘 이 글을 읽는 모든 독자에게 전하는 메시지예요.

타로 카드: "${card}" (정방향)
시간대: ${postingPeriod === 'morning' ? '오전 — 오늘의 흐름과 행동' : '저녁 — 마음과 관계'}
이번 CTA 유형: ${ctaTypeLabel}

━━━━━━━━━━━━━━━━━━━━━━━
[게시물 구성 — 반드시 이 순서로]

① 독자와 카드 연결 (1~2문장)
오늘 이 글을 읽는 분들을 위해 "${card}" 카드를 꺼냈다는 것을 자연스럽게 전하세요.
카드 이름은 여기서 딱 한 번만 언급합니다. 본문에서 다시 쓰지 마세요.
문체는 매번 다르게 변형하세요. 아래는 참고 예시일 뿐, 그대로 복사하지 마세요.
  예: "오늘 이 글 앞에 잠시 멈춘 분들을 위해 ○○ 카드를 펼쳤어요."
  예: "지금 이 글이 눈에 들어왔다면, ○○ 카드의 메시지를 잠시 들어보세요."
  예: "오늘 당신에게 닿은 카드는 ○○예요."
금지 표현: "이 글을 본 것은 우연이 아닙니다" / "운명처럼" / "우주가 보낸" / "이 카드를 놓치면 안 됩니다"
신비로운 분위기가 필요할 때만: "우연이 아닐지도 몰라요" (매번 쓰지 말 것)

② 구체적인 상황 후킹 (1~2문장, 질문 1개)
"${card}" 카드가 상징하는 구체적인 고민이나 감정 하나를 짚는 질문을 써주세요.
  - 독자가 최근 실제로 겪었을 법한 장면을 담을 것
  - 하나의 질문 안에서 서로 반대되는 감정을 모두 나열하지 말 것
  - "기분이 좋거나 나쁘지 않나요?" 같은 누구에게나 맞는 질문 금지
  - 카드의 키워드를 그대로 쓰지 말고 일상 언어로 바꿀 것
  - 게시물 전체에서 질문은 이 한 개만

③ 오늘의 핵심 메시지 (2~3문장)
"${card}" 카드만의 고유한 분위기, 에너지, 갈등 구도를 살려서 작성하세요.
  - 밝고 적극적인 카드 → 자신감과 행동이 느껴지는 문체
  - 불확실성 카드 → 흔들리는 감정과 판단의 한계
  - 균형·판단 카드 → 사실, 책임, 선택에 초점
  - 시작·자유 카드 → 경험, 용기, 주의할 점
  - 변화·붕괴 카드 → 불편한 현실을 억지로 긍정 포장하지 말 것
  - 모든 카드를 "서두르지 말고 마음을 살펴보세요"로 끝내지 말 것

④ 오늘 할 수 있는 행동 (1~2문장)
독자가 오늘 실제로 해볼 수 있는 구체적인 행동 한 가지를 제안하세요.
카드에 따라 시작하기·말하기·확인하기·멈추기·정리하기·선택하기 등 서로 다른 행동을 써주세요.
모든 카드에서 위로·기다림·내려놓기만 반복하지 마세요.

⑤ CTA (1문장만, 본문과 직접 연결)
유형: ${ctaTypeLabel}
  - 선택형: "A와 B 중 어느 쪽인가요?" — 서로 다른 두 선택지
  - 한단어형: 지금 상태를 한 단어로 표현하도록 유도
  - 최근경험형: 최근에 실제로 겪었을 법한 경험을 묻는 질문
  - 이모지공감형: 이모지 하나로 반응하게 하는 공감 문장
  - 여운형: 댓글 요구 없이 마음속으로 생각해보게 하는 질문
  - 프로필안내형: "내 상황에 맞는 카드가 궁금하다면 프로필에서 무료로 한 장 뽑아보세요." 식으로 자연스럽게 안내
주의: CTA는 한 개만. 프로필 안내형 게시물에 댓글·이모지 반응을 동시에 요구하지 마세요.
오전 CTA → 오늘 행동·선택·마음가짐과 연결
저녁 CTA → 관계·감정·자신의 마음을 돌아보게 연결

⑥ 해시태그
반드시 아래 세 개를 정확히, 모든 # 포함해서 작성하세요:
#데일리타로 #오늘의타로 #타로리딩
첫 번째 #를 절대 누락하지 마세요.

━━━━━━━━━━━━━━━━━━━━━━━
${postingPeriod === 'morning' ? `[오전 리딩 방향]
- 오늘 하루에 어떤 흐름이 나타날 수 있는지 알려주세요.
- 일·선택·집중·감정 조절·관계·행동 중 "${card}" 카드에 가장 잘 맞는 한 가지 주제를 선택하세요.
- 독자가 오늘 바로 실천할 수 있는 행동 하나가 분명하게 드러나게 하세요.
- 막연한 긍정이나 위로보다 "오늘 무엇을 하면 좋은지"가 느껴지게 하세요.
- 연애나 상대방 속마음으로만 해석하지 마세요.` :
`[저녁 리딩 방향]
- 하루를 마무리하며 떠오르는 사람이나 감정을 구체적으로 짚어주세요.
- 상대방의 마음을 사실처럼 단정하지 마세요.
- 모든 카드를 재회·연락·호감으로 해석하지 마세요.
- 상대방만 바라보게 하지 말고, 독자가 관계 안에서 무엇을 확인해야 하는지도 알려주세요.
- 관계를 무조건 붙잡거나 내려놓으라고 결론 내리지 마세요.`}

━━━━━━━━━━━━━━━━━━━━━━━
[공통 금지 사항]
- 카드 설명 중심 금지 → 독자의 상황과 감정 중심으로
- 아래 표현 연속 사용 금지: "○○ 카드가 찾아왔어요" / "천천히 들여다볼게요" / "조용히 살펴보세요" / "마음에 걸리는 것이 있나요?" / "오늘은 서두르지 않아도 괜찮아요"
- 카드 이름만 바꾸고 같은 문장 구조 재사용 금지
- 이모지는 게시물 전체에서 1~2개만
- 마크다운 기호(**) 사용 금지
- "곧 연락이 옵니다" / "반드시 이루어집니다" 등 결과 확정 표현 금지
- 불안을 자극하거나 억지로 끼워 맞추는 해석 금지
- "마음에 닿는 부분만 편하게 받아가세요" 기본 태도 유지 (단, 이 문장을 매번 쓰진 말 것)

[분량]
- ①~④ 본문: 한글 기준 350~550자 (CTA·해시태그 제외)
- 각 문단 1~3문장, 같은 의미를 표현만 바꿔 반복하지 마세요

[최종 검증 — 하나라도 충족 못하면 다시 작성]
- 첫 두 줄만 읽어도 공동 리딩이라는 것이 느껴지는가?
- 독자가 "나와 무슨 상관이지?"라고 느끼지 않도록 구체적인 상황이 들어갔는가?
- "${card}" 카드만의 고유한 분위기와 조언이 드러나는가?
- 본문 350~550자 이내인가?
- 오늘 할 수 있는 행동이 한 가지로 명확한가?
- CTA가 한 개만인가?
- 해시태그 세 개 모두 # 포함됐는가?

최종 결과는 반드시 아래 JSON 형식으로만 출력합니다.

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
