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