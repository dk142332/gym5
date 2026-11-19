export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { images, goal, duration } = req.body;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: '운동기구 사진을 최소 1장 이상 업로드해주세요.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
당신은 친절하고 전문적인 퍼스널 트레이너입니다.
첨부된 사진들은 헬스장 초보자(헬린이)가 현재 이용할 수 있는 운동기구들입니다.

[사용자 조건]
- 운동 목표: ${goal || '전신 근력 및 기초 체력 향상'}
- 희망 운동 시간: ${duration || '40~50분'}

[요청 사항]
1. **인식된 운동기구 목록**: 사진에서 확인되는 기구들의 정확한 명칭과 주요 타겟 부위를 나열해주세요.
2. **맞춤형 헬린이 운동 루틴**: 오직 위에서 인식된 기구들(필요시 맨몸운동 포함)만을 활용해 순서대로 루틴을 짜주세요.
   - 각 운동마다 **추천 세트 수, 횟수, 휴식 시간**을 명시하세요.
3. **초보자 핵심 팁**: 기구 사용 시 부상을 방지하기 위한 자세 팁과 중량 설정 방법을 간단명료하게 알려주세요.

가독성이 좋도록 마크다운(Markdown) 형식으로 깔끔하게 작성해주세요.
`;

    // 텍스트 프롬프트와 이미지 데이터를 REST API 규격 배열로 조립
    const parts = [
      { text: prompt },
      ...images.map((base64Data) => ({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Data.split(',')[1],
        },
      })),
    ];

    // 외부 라이브러리 없이 기본 fetch로 구글 API 서버에 직접 POST 요청
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API 호출 실패');
    }

    const resultText = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ result: resultText });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}