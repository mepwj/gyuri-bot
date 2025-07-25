const axios = require('axios');
const config = require('../../config/config.json');

const generateWithLLM = async (prompt, options = {}) => {
    if (!config.features.enableLLM || !process.env.OPENAI_API_KEY) {
        return null;
    }
    
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: options.model || 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: options.systemPrompt || '당신은 귀엽고 친근한 규리봇입니다. 항상 밝고 긍정적으로 대답해주세요.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: options.maxTokens || 150,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('LLM 생성 오류:', error);
        return null;
    }
};

const generateFortune = async (userName) => {
    const prompt = `${userName}님의 오늘 운세를 귀엽고 긍정적으로 3줄로 알려주세요. 이모지를 포함해주세요.`;
    return await generateWithLLM(prompt, {
        systemPrompt: '당신은 긍정적이고 재미있는 운세를 알려주는 규리봇입니다.',
        maxTokens: 100
    });
};

const generateMotivation = async (context) => {
    const prompt = `${context ? `"${context}"에 대해` : ''} 힘이 나는 응원 메시지를 2줄로 작성해주세요. 이모지를 포함해주세요.`;
    return await generateWithLLM(prompt, {
        systemPrompt: '당신은 따뜻하고 격려하는 메시지를 전하는 규리봇입니다.',
        maxTokens: 80
    });
};

const generateJoke = async (topic) => {
    const prompt = `${topic ? `"${topic}"에 관한` : ''} 재미있고 무해한 농담을 하나 만들어주세요.`;
    return await generateWithLLM(prompt, {
        systemPrompt: '당신은 유머러스하고 친근한 규리봇입니다. 모든 연령대가 즐길 수 있는 깨끗한 농담을 만들어주세요.',
        maxTokens: 100
    });
};

const generateRecommendation = async (category) => {
    const prompt = `${category ? `"${category}" 카테고리에서` : ''} 재미있는 활동이나 취미를 추천해주세요. 간단한 설명도 포함해주세요.`;
    return await generateWithLLM(prompt, {
        systemPrompt: '당신은 다양한 활동을 추천하는 규리봇입니다.',
        maxTokens: 120
    });
};

module.exports = {
    generateWithLLM,
    generateFortune,
    generateMotivation,
    generateJoke,
    generateRecommendation
};