const { OpenAI } = require('openai');

let openai = null;

// 유저별 대화 히스토리 저장 (최대 10개 메시지)
const conversationHistory = new Map();
const MAX_HISTORY_LENGTH = 10;
const HISTORY_EXPIRE_MS = 30 * 60 * 1000; // 30분 후 만료

const initializeOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
};

/**
 * 유저의 대화 히스토리를 가져옴
 * @param {string} userId - 유저 ID
 * @returns {Array} 대화 히스토리 배열
 */
const getHistory = (userId) => {
    const data = conversationHistory.get(userId);
    if (!data) return [];

    // 만료 체크
    if (Date.now() - data.lastUpdated > HISTORY_EXPIRE_MS) {
        conversationHistory.delete(userId);
        return [];
    }

    return data.messages;
};

/**
 * 유저의 대화 히스토리에 메시지 추가
 * @param {string} userId - 유저 ID
 * @param {string} role - 'user' 또는 'assistant'
 * @param {string} content - 메시지 내용
 */
const addToHistory = (userId, role, content) => {
    let data = conversationHistory.get(userId);

    if (!data) {
        data = { messages: [], lastUpdated: Date.now() };
    }

    data.messages.push({ role, content });
    data.lastUpdated = Date.now();

    // 히스토리 길이 제한
    if (data.messages.length > MAX_HISTORY_LENGTH * 2) {
        data.messages = data.messages.slice(-MAX_HISTORY_LENGTH * 2);
    }

    conversationHistory.set(userId, data);
};

/**
 * 유저의 대화 히스토리 초기화
 * @param {string} userId - 유저 ID
 */
const clearHistory = (userId) => {
    conversationHistory.delete(userId);
};

// 오래된 히스토리 정리 (1시간마다)
setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of conversationHistory.entries()) {
        if (now - data.lastUpdated > HISTORY_EXPIRE_MS) {
            conversationHistory.delete(userId);
        }
    }
}, 60 * 60 * 1000);

const generateAIResponse = async (userMessage, userName, userId) => {
    try {
        const ai = initializeOpenAI();
        if (!ai) {
            return null;
        }

        const systemPrompt = `너는 '규리봇'이라는 이름의 친근하고 귀여운 Discord 봇이야.

다음과 같은 성격을 가지고 있어:
- 밝고 긍정적이며 친근한 말투 사용
- 이모지를 적절히 사용 (특히 🍊 귤 이모지)
- 한국어로 자연스럽게 대화
- 상대방의 감정에 공감하고 응원
- 짧고 간결하게 대답 (1-3문장)
- 반말이 아닌 존댓말 사용
- 이전 대화 내용을 기억하고 맥락에 맞게 대답

너가 제공하는 주요 기능들:
[기본]
- !안녕 또는 /안녕: 시간대별 맞춤 인사
- !출근 또는 /출근: 출근 응원 메시지
- !야근: 야근 응원 메시지
- !퇴근 또는 /퇴근: 퇴근까지 남은 시간 계산 (18시 기준)
- !도움말 또는 /도움말: 전체 명령어 목록

[운세/재미]
- !운세 또는 /운세: 오늘의 운세와 행운 아이템 (일반/개발자/연애/학업/건강)
- !오하아사 또는 /오하아사: 오늘의 별자리 운세 (12궁 별자리)
- !농담 또는 /농담: 재미있는 아재개그
- !퀴즈 또는 /퀴즈: 다양한 주제의 퀴즈

[유틸리티]
- !메뉴 또는 /메뉴: 점심/저녁 메뉴 추천
- !파이팅 또는 /파이팅: 동기부여 응원 메시지
- !명언 또는 /명언: 감동적인 명언
- !추천 또는 /추천: 영화/음악/책/게임 추천
- !팁 또는 /팁: 유용한 생활 팁

사용자가 특정 기능에 대해 물어보면, 해당 명령어를 자연스럽게 안내해줘.
예: "운세가 궁금해" → "!운세 명령어로 오늘의 운세를 확인해보세요! 🍊"
예: "별자리 운세 알려줘" → "!오하아사 명령어로 12궁 별자리 운세를 볼 수 있어요! ⭐"

현재 대화 중인 사용자: ${userName}님`;

        // 이전 대화 히스토리 가져오기
        const history = userId ? getHistory(userId) : [];

        // 메시지 구성: system + 히스토리 + 현재 메시지
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage }
        ];

        const completion = await ai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 200,
            temperature: 0.8
        });

        const aiResponse = completion.choices[0].message.content;

        // 대화 히스토리에 저장
        if (userId) {
            addToHistory(userId, 'user', userMessage);
            addToHistory(userId, 'assistant', aiResponse);
        }

        return aiResponse;
    } catch (error) {
        console.error('OpenAI API 오류:', error);
        return null;
    }
};

module.exports = {
    generateAIResponse,
    clearHistory,
    getHistory
};