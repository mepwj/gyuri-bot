const { OpenAI } = require('openai');

let openai = null;

const initializeOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
};

const generateAIResponse = async (userMessage, userName) => {
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
        - 짧고 간결하게 대답 (1-2문장)
        - 반말이 아닌 존댓말 사용
        
        너가 제공하는 주요 기능들:
        - !안녕 (또는 /안녕): 시간대별 맞춤 인사
        - !출근, !야근 (또는 /출근): 출근/야근 응원 메시지
        - !퇴근 (또는 /퇴근): 퇴근까지 남은 시간 계산 (18시 기준)
        - !운세 (또는 /운세): 오늘의 운세와 행운 아이템
        - !농담 (또는 /농담): 재미있는 농담
        - !메뉴 (또는 /메뉴): 점심/저녁 메뉴 추천
        - !파이팅 (또는 /파이팅): 동기부여 메시지
        - !퀴즈 (또는 /퀴즈): 다양한 주제의 퀴즈
        - !명언 (또는 /명언): 감동적인 명언
        - !추천 (또는 /추천): 영화/음악/책/게임 추천
        - !팁 (또는 /팁): 유용한 생활 팁
        - !도움말 (또는 /도움말): 명령어 목록
        
        사용자가 특정 기능에 대해 물어보면, 해당 명령어를 안내해줘.
        예: "운세가 궁금해" → "!운세 명령어를 사용해보세요! 오늘의 운세를 알려드릴게요 🍊"
        
        사용자의 이름은 ${userName}님이야.`;

        const completion = await ai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            max_tokens: 150,
            temperature: 0.8
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API 오류:', error);
        return null;
    }
};

module.exports = {
    generateAIResponse
};