const axios = require('axios');
const cron = require('node-cron');
const { translateOhaasaFortunes } = require('./llmGenerator');

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

// 데이터 소스 정의 (순서대로 시도, 첫 번째 성공 시 사용)
// ABC TV는 JavaScript 동적 렌더링이라 axios로 불가능, TV 아사히 우선 사용
const DATA_SOURCES = [
    {
        name: 'TV_ASAHI',
        url: 'https://www.tv-asahi.co.jp/goodmorning/uranai/',
        parser: parseTvAsahiHtml
    }
];

/**
 * HTML 엔티티를 디코딩 (이모지 포함)
 */
function decodeHtmlEntities(text) {
    if (!text) return text;
    return text
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

// 캐시 저장소
let cache = {
    data: null,
    date: null,
    fetchedAt: null,
    translated: false,
    source: null
};

// 스케줄러 상태
let schedulerTask = null;
let isSchedulerRunning = false;

/**
 * ABC TV (오사카) 사이트 HTML 파싱
 * URL: https://www.asahi.co.jp/ohaasa/week/horoscope/index.html
 */
function parseAbcTvHtml(html) {
    const fortunes = [];
    let currentDate = null;

    // 날짜 추출: <h4><span>12</span>月<span>26</span>日
    const dateMatch = html.match(/<h4[^>]*><span>(\d+)<\/span>月<span>(\d+)<\/span>日/);
    if (dateMatch) {
        currentDate = `${dateMatch[1]}/${dateMatch[2]}`;
    }

    // 각 별자리 운세 추출
    // <li class="rank1 libra">
    //   <dl>
    //     <dt><span class="horo_rank">1</span><sapn class="horo_name">てんびん座</sapn></dt>
    //     <dd class="horo_txt">운세내용\t럭키아이템</dd>
    //   </dl>
    // </li>
    const fortunePattern = /<li[^>]*class="[^"]*(?:rank)?(\d+)?[^"]*\s+(\w+)[^"]*"[^>]*>\s*<dl>\s*<dt><span[^>]*class="horo_rank"[^>]*>(\d+)<\/span><sapn[^>]*class="horo_name[^"]*"[^>]*>([^<]+)<\/sapn><\/dt>\s*<dd[^>]*class="horo_txt"[^>]*>([^<]+)<\/dd>/gi;

    let match;
    while ((match = fortunePattern.exec(html)) !== null) {
        const rank = parseInt(match[3], 10);
        const zodiacJp = match[4].trim();
        const contentRaw = decodeHtmlEntities(match[5]);

        // 탭으로 구분된 내용 파싱 (마지막이 럭키아이템)
        const parts = contentRaw.split('\t').map(p => p.trim()).filter(p => p);

        let luckyItem = null;
        let fortuneLines = [];

        if (parts.length > 1) {
            luckyItem = parts[parts.length - 1];
            fortuneLines = parts.slice(0, -1);
        } else {
            fortuneLines = parts;
        }

        const zodiacData = ZODIAC_MAP[zodiacJp];
        if (zodiacData) {
            fortunes.push({
                rank,
                zodiacJp,
                zodiacKo: zodiacData.ko,
                zodiacEn: zodiacData.en,
                dates: zodiacData.dates,
                fortune: fortuneLines.join(' '),
                luckyItem: luckyItem,
                originalFortune: fortuneLines.join(' '),
                originalLuckyItem: luckyItem
            });
        }
    }

    fortunes.sort((a, b) => a.rank - b.rank);

    return {
        date: currentDate,
        fortunes,
        fetchedAt: new Date().toISOString(),
        source: 'ABC_TV'
    };
}

/**
 * TV 아사히 (도쿄) 사이트 HTML 파싱
 * URL: https://www.tv-asahi.co.jp/goodmorning/uranai/
 */
function parseTvAsahiHtml(html) {
    const fortunes = [];
    let currentDate = null;

    // 날짜 추출: 12月30日（Tue）の占い
    const dateMatch = html.match(/(\d+)月(\d+)日[（\(][^）\)]+[）\)]の占い/);
    if (dateMatch) {
        currentDate = `${dateMatch[1]}/${dateMatch[2]}`;
    }

    // 순위 추출 (이미지 기반: rank-1.png, rank-2.png 등)
    const rankings = {};
    const rankPattern = /<a[^>]*data-label="(\w+)"[^>]*>[\s\S]*?<img[^>]*src="images\/rank-(\d+)\.png"[\s\S]*?<span>([^<]+)<\/span>/gi;
    let rankMatch;
    while ((rankMatch = rankPattern.exec(html)) !== null) {
        rankings[rankMatch[3].trim()] = parseInt(rankMatch[2]);
    }

    // 운세 섹션 추출 (seiza-box 구조)
    const sectionPattern = /<div[^>]*class="seiza-box"[^>]*id="(\w+)"[^>]*>[\s\S]*?<p[^>]*class="seiza-txt"[^>]*>([^<]+)<span[^>]*class="period"[^>]*>\(([^)]+)\)<\/span><\/p>[\s\S]*?<p[^>]*class="read"[^>]*>([^<]+)<\/p>[\s\S]*?ラッキーカラー<\/span>[：:]([^<]+)<br[\s\S]*?幸運のカギ<\/span>[：:]([^<\n]+)/gi;

    let sectionMatch;
    while ((sectionMatch = sectionPattern.exec(html)) !== null) {
        const zodiacJp = sectionMatch[2].trim();
        const fortune = decodeHtmlEntities(sectionMatch[4].trim());
        const luckyColor = sectionMatch[5].trim();
        const luckyKey = sectionMatch[6].trim();

        // 럭키아이템 조합
        const luckyItem = `럭키컬러: ${luckyColor} / 행운의 열쇠: ${luckyKey}`;

        const zodiacData = ZODIAC_MAP[zodiacJp];
        if (zodiacData) {
            fortunes.push({
                rank: rankings[zodiacJp] || fortunes.length + 1,
                zodiacJp,
                zodiacKo: zodiacData.ko,
                zodiacEn: zodiacData.en,
                dates: zodiacData.dates,
                fortune,
                luckyItem,
                originalFortune: fortune,
                originalLuckyItem: `ラッキーカラー: ${luckyColor} / 幸運のカギ: ${luckyKey}`
            });
        }
    }

    // 순위대로 정렬
    fortunes.sort((a, b) => a.rank - b.rank);

    return {
        date: currentDate,
        fortunes,
        fetchedAt: new Date().toISOString(),
        source: 'TV_ASAHI'
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
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    const month = jstDate.getUTCMonth() + 1;
    const day = jstDate.getUTCDate();
    return `${month}/${day}`;
}

/**
 * 데이터 소스에서 HTML 가져오기
 */
async function fetchFromSource(source) {
    try {
        console.log(`[OhaasaScraper] ${source.name}에서 데이터 가져오기 시도...`);

        const response = await axios.get(source.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ja,ko;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            },
            timeout: 15000
        });

        const html = response.data;
        return source.parser(html);
    } catch (error) {
        console.error(`[OhaasaScraper] ${source.name} 스크래핑 실패:`, error.message);
        return null;
    }
}

/**
 * 모든 소스를 번갈아 시도하여 오늘 데이터 가져오기
 */
async function fetchOhaasaFortune() {
    const todayJST = getTodayDateJST();

    for (const source of DATA_SOURCES) {
        const data = await fetchFromSource(source);

        if (data && data.fortunes.length > 0) {
            console.log(`[OhaasaScraper] ${source.name}: 날짜=${data.date}, 오늘=${todayJST}`);

            if (data.date === todayJST) {
                console.log(`[OhaasaScraper] ✅ ${source.name}에서 오늘 데이터 발견!`);
                return data;
            } else {
                console.log(`[OhaasaScraper] ${source.name}: 아직 오늘 데이터 아님`);
            }
        }
    }

    return null;
}

/**
 * OpenAI API를 사용하여 일본어 운세를 한국어로 번역
 */
async function translateFortunesWithOpenAI(fortunes) {
    try {
        console.log('[OhaasaScraper] OpenAI API로 번역 시작...');
        const translatedFortunes = await translateOhaasaFortunes(fortunes);
        console.log('[OhaasaScraper] OpenAI 번역 완료');
        return translatedFortunes;
    } catch (error) {
        console.error('[OhaasaScraper] OpenAI 번역 오류:', error.message);
        return fortunes.map(f => ({ ...f, translated: false }));
    }
}

/**
 * 운세 데이터 가져오기 및 번역
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
        console.log('[OhaasaScraper] 오늘 데이터 없음 (모든 소스 확인 완료)');
        return null;
    }

    console.log('[OhaasaScraper] 번역 시작...');

    // OpenAI API로 번역
    const translatedFortunes = await translateFortunesWithOpenAI(data.fortunes);

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
        translated: translatedData.translated,
        source: data.source
    };

    console.log(`[OhaasaScraper] 데이터 캐시 완료 (소스: ${data.source}, 번역: ${translatedData.translated ? '성공' : '실패'})`);

    return translatedData;
}

/**
 * 자동 업데이트 (재시도 없이 단순 시도)
 */
async function autoUpdate() {
    const todayJST = getTodayDateJST();

    // 이미 오늘 데이터가 있으면 중단
    if (cache.data && cache.date === todayJST && cache.translated) {
        console.log('[OhaasaScraper] 오늘 업데이트 완료됨.');
        return;
    }

    const result = await fetchAndTranslate();

    if (result) {
        console.log(`[OhaasaScraper] ✅ 자동 업데이트 성공! (소스: ${result.source})`);
    } else {
        console.log('[OhaasaScraper] ⏳ 오늘 데이터 아직 없음. 다음 스케줄에서 재시도.');
    }
}

/**
 * 자동 스케줄러 시작
 * 매시간 정각에 시도 (06:00 ~ 12:00)
 */
function startScheduler() {
    if (isSchedulerRunning) {
        console.log('[OhaasaScraper] 스케줄러가 이미 실행 중입니다.');
        return;
    }

    // 매일 06:00 ~ 12:00 사이 매시간 정각에 시도
    schedulerTask = cron.schedule('0 6-12 * * *', async () => {
        const hour = new Date().getHours();
        console.log(`[OhaasaScraper] ⏰ 스케줄 실행 (${hour}:00)`);
        await autoUpdate();
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
            translated: false,
            source: null
        };
    }, {
        timezone: 'Asia/Tokyo'
    });

    isSchedulerRunning = true;
    console.log('[OhaasaScraper] 📅 자동 스케줄러 시작됨 (JST 06:00~12:00 매시간)');

    // 시작 시 즉시 한번 시도
    autoUpdate();
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
        stale: data.stale,
        source: data.source
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
        source: cache.source,
        isSchedulerRunning
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
