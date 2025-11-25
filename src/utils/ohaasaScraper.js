const axios = require('axios');
const cron = require('node-cron');
const translate = require('google-translate-api-x');

// 일본 별자리 이름을 한국어로 매핑
const ZODIAC_MAP = {
    'おひつじ座': { ko: '양자리', en: 'aries', dates: '3/21~4/19' },
    'おうし座': { ko: '황소자리', en: 'taurus', dates: '4/20~5/20' },
    'ふたご座': { ko: '쌍둥이자리', en: 'gemini', dates: '5/21~6/21' },
    'かに座': { ko: '게자리', en: 'cancer', dates: '6/22~7/22' },
    'しし座': { ko: '사자자리', en: 'leo', dates: '7/23~8/22' },
    'おとめ座': { ko: '처녀자리', en: 'virgo', dates: '8/23~9/22' },
    'てんびん座': { ko: '천칭자리', en: 'libra', dates: '9/23~10/23' },
    'さそり座': { ko: '전갈자리', en: 'scorpio', dates: '10/24~11/21' },
    'いて座': { ko: '궁수자리', en: 'sagittarius', dates: '11/22~12/21' },
    'やぎ座': { ko: '염소자리', en: 'capricorn', dates: '12/22~1/19' },
    'みずがめ座': { ko: '물병자리', en: 'aquarius', dates: '1/20~2/18' },
    'うお座': { ko: '물고기자리', en: 'pisces', dates: '2/19~3/20' }
};

// 한국어 별자리 이름으로 검색할 수 있도록 역매핑
const KOREAN_TO_JP = {};
Object.entries(ZODIAC_MAP).forEach(([jp, data]) => {
    KOREAN_TO_JP[data.ko] = jp;
    KOREAN_TO_JP[data.en] = jp;
});

// 캐시 저장소
let cache = {
    data: null,
    date: null,
    fetchedAt: null,
    translated: false
};

// 스케줄러 상태
let schedulerTask = null;
let isSchedulerRunning = false;
let retryCount = 0;
const MAX_RETRIES = 10;
const BASE_RETRY_DELAY = 5 * 60 * 1000; // 5분

/**
 * himantorend.com에서 오하아사 운세 데이터를 스크래핑
 */
async function fetchOhaasaFortune() {
    const url = 'https://himantorend.com/ohayouasahidesuseizauranai8/';

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ja,ko;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            },
            timeout: 15000
        });

        const html = response.data;
        return parseOhaasaHtml(html);
    } catch (error) {
        console.error('[OhaasaScraper] 스크래핑 실패:', error.message);
        return null;
    }
}

/**
 * HTML을 파싱하여 운세 데이터 추출
 */
function parseOhaasaHtml(html) {
    const fortunes = [];
    let currentDate = null;

    // 날짜 추출 (예: "11月25日" -> "11/25")
    const dateMatch = html.match(/<h3><span[^>]*>(\d+)月(\d+)日<\/span><\/h3>/);
    if (dateMatch) {
        currentDate = `${dateMatch[1]}/${dateMatch[2]}`;
    }

    // 각 별자리 운세 추출
    const fortunePattern = /<h5><span[^>]*>([０-９0-9]+)位\s*([ぁ-んァ-ン一-龥]+座)\([^)]+\)<\/span><\/h5>\s*<p><span[^>]*>([\s\S]*?)<\/span><\/p>/g;

    let match;
    while ((match = fortunePattern.exec(html)) !== null) {
        const rank = convertJapaneseNumber(match[1]);
        const zodiacJp = match[2];
        const contentRaw = match[3];

        // 운세 내용 파싱
        const lines = contentRaw
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line);

        // 럭키 아이템 추출
        let luckyItem = null;
        const fortuneLines = [];

        for (const line of lines) {
            if (line.startsWith('💡') || line.includes('💡：') || line.includes('💡:')) {
                luckyItem = line.replace(/💡[：:]?\s*/, '').trim();
            } else {
                fortuneLines.push(line);
            }
        }

        const zodiacData = ZODIAC_MAP[zodiacJp];
        if (zodiacData) {
            fortunes.push({
                rank,
                zodiacJp,
                zodiacKo: zodiacData.ko,
                zodiacEn: zodiacData.en,
                dates: zodiacData.dates,
                fortune: fortuneLines.join('\n'),
                luckyItem: luckyItem || '정보 없음',
                originalFortune: fortuneLines.join('\n'),
                originalLuckyItem: luckyItem || '정보 없음'
            });
        }
    }

    // 순위대로 정렬
    fortunes.sort((a, b) => a.rank - b.rank);

    return {
        date: currentDate,
        fortunes,
        fetchedAt: new Date().toISOString()
    };
}

/**
 * 전각 숫자를 반각 숫자로 변환
 */
function convertJapaneseNumber(str) {
    const zenToHan = {
        '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
        '５': '5', '６': '6', '７': '7', '８': '8', '９': '9'
    };
    const converted = str.replace(/[０-９]/g, s => zenToHan[s] || s);
    return parseInt(converted, 10);
}

/**
 * 오늘 날짜(일본 시간 기준) 확인
 */
function getTodayDateJST() {
    const now = new Date();
    // JST = UTC + 9
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    const month = jstDate.getUTCMonth() + 1;
    const day = jstDate.getUTCDate();
    return `${month}/${day}`;
}

/**
 * Google Translate를 사용하여 일본어 운세를 한국어로 번역
 */
async function translateFortunesWithGoogle(fortunes) {
    try {
        const translatedFortunes = [];

        for (const fortune of fortunes) {
            try {
                // 운세 텍스트 번역
                const fortuneResult = await translate(fortune.fortune, { from: 'ja', to: 'ko' });
                const translatedFortune = fortuneResult.text;

                // 럭키 아이템 번역
                let translatedLuckyItem = fortune.luckyItem;
                if (fortune.luckyItem && fortune.luckyItem !== '정보 없음') {
                    const luckyResult = await translate(fortune.luckyItem, { from: 'ja', to: 'ko' });
                    translatedLuckyItem = luckyResult.text;
                }

                translatedFortunes.push({
                    ...fortune,
                    fortune: translatedFortune,
                    luckyItem: translatedLuckyItem,
                    translated: true
                });

                // API 제한 방지를 위한 딜레이
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                console.error(`[OhaasaScraper] ${fortune.zodiacKo} 번역 실패:`, err.message);
                translatedFortunes.push({ ...fortune, translated: false });
            }
        }

        return translatedFortunes;
    } catch (error) {
        console.error('[OhaasaScraper] Google 번역 오류:', error.message);
        return fortunes.map(f => ({ ...f, translated: false }));
    }
}

/**
 * 지수 백오프 딜레이 계산
 */
function getRetryDelay(attempt) {
    // 5분, 10분, 20분, 40분... 최대 1시간
    const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), 60 * 60 * 1000);
    // 약간의 랜덤성 추가 (±20%)
    const jitter = delay * (0.8 + Math.random() * 0.4);
    return Math.floor(jitter);
}

/**
 * 운세 데이터 가져오기 및 번역 (자동 재시도)
 */
async function fetchAndTranslate() {
    const todayJST = getTodayDateJST();

    // 이미 오늘 데이터가 있으면 스킵
    if (cache.data && cache.date === todayJST && cache.translated) {
        console.log('[OhaasaScraper] 오늘 데이터 이미 캐시됨');
        return cache.data;
    }

    console.log(`[OhaasaScraper] 데이터 가져오기 시도... (${todayJST})`);

    const data = await fetchOhaasaFortune();

    if (!data || data.fortunes.length === 0) {
        console.log('[OhaasaScraper] 데이터 없음');
        return null;
    }

    // 날짜 확인
    if (data.date !== todayJST) {
        console.log(`[OhaasaScraper] 아직 오늘 데이터 아님 (사이트: ${data.date}, 오늘: ${todayJST})`);
        return null;
    }

    console.log('[OhaasaScraper] 오늘 데이터 발견! 번역 시작...');

    // Google Translate로 번역
    const translatedFortunes = await translateFortunesWithGoogle(data.fortunes);

    const translatedData = {
        ...data,
        fortunes: translatedFortunes,
        translated: translatedFortunes.some(f => f.translated)
    };

    // 캐시 업데이트
    cache = {
        data: translatedData,
        date: data.date,
        fetchedAt: new Date().toISOString(),
        translated: translatedData.translated
    };

    console.log(`[OhaasaScraper] 데이터 캐시 완료 (번역: ${translatedData.translated ? '성공' : '실패'})`);

    return translatedData;
}

/**
 * 재시도 로직이 포함된 자동 업데이트
 */
async function autoUpdateWithRetry() {
    const todayJST = getTodayDateJST();

    // 이미 오늘 데이터가 있으면 중단
    if (cache.data && cache.date === todayJST && cache.translated) {
        console.log('[OhaasaScraper] 오늘 업데이트 완료됨. 재시도 중단.');
        retryCount = 0;
        return;
    }

    const result = await fetchAndTranslate();

    if (result) {
        console.log('[OhaasaScraper] ✅ 자동 업데이트 성공!');
        retryCount = 0;
    } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = getRetryDelay(retryCount);
        console.log(`[OhaasaScraper] ⏳ 재시도 ${retryCount}/${MAX_RETRIES} 예정 (${Math.round(delay / 60000)}분 후)`);

        setTimeout(autoUpdateWithRetry, delay);
    } else {
        console.log('[OhaasaScraper] ❌ 최대 재시도 횟수 도달. 다음 스케줄까지 대기.');
        retryCount = 0;
    }
}

/**
 * 자동 스케줄러 시작
 * 일본 시간 기준 아침 6시, 7시, 8시에 시도
 */
function startScheduler() {
    if (isSchedulerRunning) {
        console.log('[OhaasaScraper] 스케줄러가 이미 실행 중입니다.');
        return;
    }

    // JST 6:00, 7:00, 8:00 = UTC 21:00(전날), 22:00(전날), 23:00(전날)
    // KST 기준으로는 6:00, 7:00, 8:00 (한국과 일본 시간 동일)

    // 매일 아침 6시 (한국/일본 시간)에 첫 시도
    schedulerTask = cron.schedule('0 6 * * *', async () => {
        console.log('[OhaasaScraper] ⏰ 스케줄 시작 (06:00)');
        retryCount = 0;
        await autoUpdateWithRetry();
    }, {
        timezone: 'Asia/Tokyo'
    });

    // 자정에 캐시 초기화 (새로운 날 준비)
    cron.schedule('0 0 * * *', () => {
        console.log('[OhaasaScraper] 🔄 자정 캐시 초기화');
        cache = {
            data: null,
            date: null,
            fetchedAt: null,
            translated: false
        };
        retryCount = 0;
    }, {
        timezone: 'Asia/Tokyo'
    });

    isSchedulerRunning = true;
    console.log('[OhaasaScraper] 📅 자동 스케줄러 시작됨 (JST 06:00 시작, 재시도 지수 백오프)');

    // 시작 시 즉시 한번 시도
    autoUpdateWithRetry();
}

/**
 * 스케줄러 중지
 */
function stopScheduler() {
    if (schedulerTask) {
        schedulerTask.stop();
        isSchedulerRunning = false;
        console.log('[OhaasaScraper] 스케줄러 중지됨');
    }
}

/**
 * 캐시된 데이터 또는 새로 스크래핑한 데이터 반환
 */
async function getOhaasaFortune(forceRefresh = false) {
    const todayJST = getTodayDateJST();

    // 캐시가 유효한 경우 캐시 반환
    if (!forceRefresh && cache.data && cache.date === todayJST) {
        return { ...cache.data, fromCache: true };
    }

    // 강제 새로고침 또는 캐시 없음
    const data = await fetchAndTranslate();

    if (data) {
        return { ...data, fromCache: false };
    }

    // 스크래핑 실패 시 기존 캐시 반환 (있으면)
    if (cache.data) {
        return { ...cache.data, fromCache: true, stale: true };
    }

    return null;
}

/**
 * 특정 별자리 운세 조회
 */
async function getZodiacFortune(zodiac) {
    const data = await getOhaasaFortune();
    if (!data) return null;

    const zodiacLower = zodiac.toLowerCase();

    let zodiacJp = KOREAN_TO_JP[zodiac] || KOREAN_TO_JP[zodiacLower];

    if (!zodiacJp && ZODIAC_MAP[zodiac]) {
        zodiacJp = zodiac;
    }

    if (!zodiacJp) return null;

    const fortune = data.fortunes.find(f => f.zodiacJp === zodiacJp);
    if (!fortune) return null;

    return {
        ...fortune,
        date: data.date,
        fromCache: data.fromCache,
        stale: data.stale
    };
}

/**
 * 오늘 운세가 업데이트되었는지 확인
 */
async function isUpdatedToday() {
    const data = await getOhaasaFortune();
    if (!data) return false;

    const todayJST = getTodayDateJST();
    return data.date === todayJST;
}

/**
 * 모든 별자리 목록 반환
 */
function getAllZodiacs() {
    return Object.entries(ZODIAC_MAP).map(([jp, data]) => ({
        jp,
        ko: data.ko,
        en: data.en,
        dates: data.dates
    }));
}

/**
 * 캐시 상태 확인
 */
function getCacheStatus() {
    return {
        hasData: !!cache.data,
        date: cache.date,
        fetchedAt: cache.fetchedAt,
        translated: cache.translated,
        isSchedulerRunning,
        retryCount
    };
}

module.exports = {
    getOhaasaFortune,
    getZodiacFortune,
    isUpdatedToday,
    getAllZodiacs,
    startScheduler,
    stopScheduler,
    getCacheStatus,
    ZODIAC_MAP,
    KOREAN_TO_JP
};
