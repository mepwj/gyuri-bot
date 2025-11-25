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

/**
 * 일본어 운세를 한국어로 자연스럽게 번역
 * @param {string} japaneseText - 일본어 운세 텍스트
 * @param {string} luckyItem - 일본어 럭키 아이템
 * @returns {Object} { fortune: string, luckyItem: string }
 */
const translateOhaasaFortune = async (japaneseText, luckyItem) => {
    const prompt = `다음 일본어 별자리 운세를 한국어로 자연스럽게 번역해주세요. 원본의 뉘앙스와 감성을 살려주세요.

운세: ${japaneseText}
럭키 아이템: ${luckyItem}

JSON 형식으로만 답변해주세요:
{"fortune": "번역된 운세", "luckyItem": "번역된 럭키 아이템"}`;

    try {
        const result = await generateWithLLM(prompt, {
            systemPrompt: '당신은 일본어-한국어 번역 전문가입니다. 별자리 운세의 감성과 뉘앙스를 살려 자연스러운 한국어로 번역합니다. 반드시 JSON 형식으로만 응답하세요.',
            maxTokens: 200,
            temperature: 0.3
        });

        if (result) {
            // JSON 파싱 시도
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    fortune: parsed.fortune || japaneseText,
                    luckyItem: parsed.luckyItem || luckyItem
                };
            }
        }
    } catch (error) {
        console.error('[LLM] 번역 오류:', error.message);
    }

    // 실패 시 원본 반환
    return { fortune: japaneseText, luckyItem };
};

/**
 * 여러 운세를 한번에 번역 (API 호출 최적화)
 * @param {Array} fortunes - 운세 배열
 * @returns {Array} 번역된 운세 배열
 */
const translateOhaasaFortunes = async (fortunes) => {
    const fortuneTexts = fortunes.map((f, i) =>
        `${i + 1}. 운세: ${f.fortune}\n   럭키: ${f.luckyItem}`
    ).join('\n');

    const prompt = `다음 12개의 일본어 별자리 운세를 한국어로 자연스럽게 번역해주세요.

${fortuneTexts}

JSON 배열 형식으로만 답변해주세요:
[{"fortune": "번역1", "luckyItem": "럭키1"}, ...]`;

    try {
        const result = await generateWithLLM(prompt, {
            systemPrompt: '당신은 일본어-한국어 번역 전문가입니다. 별자리 운세의 감성을 살려 번역합니다. 반드시 JSON 배열 형식으로만 응답하세요.',
            maxTokens: 1500,
            temperature: 0.3
        });

        if (result) {
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return fortunes.map((f, i) => ({
                    ...f,
                    fortune: parsed[i]?.fortune || f.fortune,
                    luckyItem: parsed[i]?.luckyItem || f.luckyItem,
                    translated: true
                }));
            }
        }
    } catch (error) {
        console.error('[LLM] 일괄 번역 오류:', error.message);
    }

    // 실패 시 원본 반환
    return fortunes.map(f => ({ ...f, translated: false }));
};

module.exports = {
    generateWithLLM,
    generateFortune,
    generateMotivation,
    generateJoke,
    generateRecommendation,
    translateOhaasaFortune,
    translateOhaasaFortunes
};