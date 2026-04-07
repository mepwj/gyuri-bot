const { OpenAI } = require('openai');

let openai = null;

// 하루 캐시: key = "userId:category:YYYY-MM-DD"
const fortuneCache = new Map();

// API 호출 제한
const DAILY_GLOBAL_LIMIT = 200;   // 전역 하루 최대 API 호출
const DAILY_USER_LIMIT = 5;       // 유저당 하루 최대 API 호출 (5개 카테고리)
let dailyApiCalls = { date: '', count: 0 };
const userApiCalls = new Map();   // userId -> { date, count }

const initializeOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

const getTodayKey = (userId, category) => {
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    return `${userId}:${category}:${today}`;
};

// 매일 자정에 캐시 정리
setInterval(() => {
    const now = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    for (const [key] of fortuneCache) {
        if (!key.endsWith(now)) {
            fortuneCache.delete(key);
        }
    }
}, 60 * 60 * 1000);

const checkRateLimit = (userId) => {
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

    // 전역 제한 체크 (날짜 바뀌면 리셋)
    if (dailyApiCalls.date !== today) {
        dailyApiCalls = { date: today, count: 0 };
    }
    if (dailyApiCalls.count >= DAILY_GLOBAL_LIMIT) {
        return { limited: true, reason: 'global' };
    }

    // 유저별 제한 체크
    const userData = userApiCalls.get(userId);
    if (userData && userData.date === today && userData.count >= DAILY_USER_LIMIT) {
        return { limited: true, reason: 'user' };
    }

    return { limited: false };
};

const recordApiCall = (userId) => {
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

    dailyApiCalls.count++;

    const userData = userApiCalls.get(userId);
    if (!userData || userData.date !== today) {
        userApiCalls.set(userId, { date: today, count: 1 });
    } else {
        userData.count++;
    }
};

const generateFortune = async (userName, userId, category = '총운') => {
    const cacheKey = getTodayKey(userId, category);

    // 캐시에 있으면 바로 반환 (하루에 같은 운세, API 호출 없음)
    if (fortuneCache.has(cacheKey)) {
        return fortuneCache.get(cacheKey);
    }

    // API 호출 제한 체크
    const rateCheck = checkRateLimit(userId);
    if (rateCheck.limited) {
        console.log(`[FortuneGenerator] Rate limited: ${rateCheck.reason} (user: ${userId})`);
        return getFallbackFortune(category);
    }

    const ai = initializeOpenAI();
    if (!ai) {
        return getFallbackFortune(category);
    }

    try {
        const today = new Date().toLocaleDateString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        const prompt = `오늘은 ${today}이고, 사용자 "${userName}"님의 "${category}"를 봐줘.

한국 운세 스타일로 자연스럽고 따뜻하게 작성해줘.
- 너무 부정적이지 않게, 현실적이면서도 희망적인 톤
- 구체적인 상황 묘사 포함 (예: "오후에 뜻밖의 좋은 소식", "점심 후 집중력이 높아지는 시간")
- 한국 직장인/학생 일상에 맞는 내용

반드시 아래 JSON 형식으로만 응답해:
{
  "message": "3-4문장의 운세 메시지",
  "score": 1~100 사이 점수(숫자만),
  "luckyColor": "행운의 색 (예: 연보라색)",
  "luckyNumber": "행운의 숫자 (예: 7)",
  "luckyFood": "행운의 음식 (한국 음식 위주, 예: 된장찌개)",
  "luckyDirection": "행운의 방향 (예: 남동쪽)",
  "luckyTime": "행운의 시간대 (예: 오후 2시~4시)",
  "advice": "1문장의 따뜻한 조언"
}`;

        const completion = await ai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: '너는 한국의 유명 운세 서비스처럼 따뜻하고 현실적인 운세를 제공하는 전문가야. 반드시 요청된 JSON 형식으로만 응답해. 마크다운이나 코드블록 없이 순수 JSON만 출력해.'
                },
                { role: 'user', content: prompt }
            ],
            max_tokens: 400,
            temperature: 0.9
        });

        const raw = completion.choices[0].message.content.trim();
        const fortune = JSON.parse(raw);

        // score를 숫자로 보장
        fortune.score = Number(fortune.score) || 50;

        // API 호출 카운트 기록
        recordApiCall(userId);

        // 캐시에 저장
        fortuneCache.set(cacheKey, fortune);

        return fortune;
    } catch (error) {
        console.error('[FortuneGenerator] AI 운세 생성 오류:', error);
        return getFallbackFortune(category);
    }
};

// API 실패 시 폴백 운세
const getFallbackFortune = (category) => {
    const fallbacks = {
        '총운': '오늘은 평온한 하루가 될 거예요. 작은 것에 감사하는 마음을 가져보세요.',
        '애정운': '주변 사람들에게 따뜻한 한마디를 건네보세요. 뜻밖의 좋은 반응이 돌아올 거예요.',
        '금전운': '충동적인 지출은 피하고, 계획적인 소비를 하면 좋은 하루가 될 거예요.',
        '건강운': '오늘은 가벼운 스트레칭과 충분한 수분 섭취가 도움이 될 거예요.',
        '직장운': '꼼꼼한 확인이 오늘의 성과를 좌우해요. 서두르지 말고 차근차근 진행하세요.'
    };

    return {
        message: fallbacks[category] || fallbacks['총운'],
        score: Math.floor(Math.random() * 41) + 40, // 40~80
        luckyColor: '하늘색',
        luckyNumber: String(Math.floor(Math.random() * 9) + 1),
        luckyFood: '김치찌개',
        luckyDirection: '동쪽',
        luckyTime: '오후 3시~5시',
        advice: '오늘 하루도 자신을 믿고 힘내세요! 🍊'
    };
};

module.exports = { generateFortune };
