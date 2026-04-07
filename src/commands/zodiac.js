const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed } = require('../utils/responseFormatter');
const { getDisplayName } = require('../utils/userHelper');
const { getOhaasaFortune, getZodiacFortune, getAllZodiacs, getCacheStatus } = require('../utils/ohaasaScraper');

// 별자리별 이모지
const ZODIAC_EMOJI = {
    '양자리': '♈',
    '황소자리': '♉',
    '쌍둥이자리': '♊',
    '게자리': '♋',
    '사자자리': '♌',
    '처녀자리': '♍',
    '천칭자리': '♎',
    '전갈자리': '♏',
    '궁수자리': '♐',
    '염소자리': '♑',
    '물병자리': '♒',
    '물고기자리': '♓'
};

// 순위별 메달 이모지
function getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank === 12) return '😢';
    return `${rank}위`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('별자리')
        .setDescription('오늘의 별자리 운세! (오하아사)')
        .addStringOption(option =>
            option.setName('별자리')
                .setDescription('특정 별자리 운세만 보기')
                .setRequired(false)
                .addChoices(
                    { name: '♈ 양자리 (3/21~4/19)', value: '양자리' },
                    { name: '♉ 황소자리 (4/20~5/20)', value: '황소자리' },
                    { name: '♊ 쌍둥이자리 (5/21~6/21)', value: '쌍둥이자리' },
                    { name: '♋ 게자리 (6/22~7/22)', value: '게자리' },
                    { name: '♌ 사자자리 (7/23~8/22)', value: '사자자리' },
                    { name: '♍ 처녀자리 (8/23~9/22)', value: '처녀자리' },
                    { name: '♎ 천칭자리 (9/23~10/23)', value: '천칭자리' },
                    { name: '♏ 전갈자리 (10/24~11/21)', value: '전갈자리' },
                    { name: '♐ 궁수자리 (11/22~12/21)', value: '궁수자리' },
                    { name: '♑ 염소자리 (12/22~1/19)', value: '염소자리' },
                    { name: '♒ 물병자리 (1/20~2/18)', value: '물병자리' },
                    { name: '♓ 물고기자리 (2/19~3/20)', value: '물고기자리' }
                )),

    name: '별자리',
    aliases: ['ohaasa', '별자리운세', '일본운세', '오하아사'],
    description: '오늘의 별자리 운세!',
    usage: '[별자리]',
    cooldown: 5,

    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userName = getDisplayName(interaction);

        // 별자리 옵션 파싱
        let selectedZodiac = null;
        if (isSlashCommand) {
            selectedZodiac = interaction.options.getString('별자리');
        } else {
            const args = interaction.content.split(' ').slice(1);
            if (args.length > 0) {
                selectedZodiac = args.join(' ');
            }
        }

        // 로딩 메시지
        if (isSlashCommand) {
            await interaction.deferReply();
        }

        try {
            // 특정 별자리 조회
            if (selectedZodiac) {
                const fortune = await getZodiacFortune(selectedZodiac);

                if (!fortune) {
                    const errorEmbed = createEmbed({
                        title: '❌ 별자리를 찾을 수 없어요',
                        description: '올바른 별자리 이름을 입력해주세요.\n예: 양자리, 게자리, 사자자리 등',
                        color: 0xff6b6b
                    });
                    return isSlashCommand
                        ? interaction.editReply({ embeds: [errorEmbed] })
                        : interaction.reply({ embeds: [errorEmbed] });
                }

                const embed = createSingleFortuneEmbed(fortune, userName);
                const rows = createInteractionRows(fortune.zodiacKo);

                const response = isSlashCommand
                    ? await interaction.editReply({ embeds: [embed], components: rows })
                    : await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

                await setupCollector(interaction, response, userName);
                return;
            }

            // 전체 랭킹 조회
            const data = await getOhaasaFortune();

            if (!data || data.fortunes.length === 0) {
                const cacheStatus = getCacheStatus();
                const errorEmbed = createEmbed({
                    title: '⏳ 오늘의 운세가 아직 업데이트되지 않았어요',
                    description: '오하아사는 일본 시간 아침 5시~8시경에 방송됩니다.\n' +
                        '서버가 자동으로 데이터를 가져오고 있으니 조금만 기다려주세요!\n\n' +
                        `📡 스케줄러 상태: ${cacheStatus.isSchedulerRunning ? '실행 중' : '중지됨'}\n` +
                        `🔄 재시도 횟수: ${cacheStatus.retryCount}/10`,
                    color: 0xffa500,
                    footer: { text: '출처: おはよう朝日です (ABC 아사히 방송)' }
                });
                return isSlashCommand
                    ? interaction.editReply({ embeds: [errorEmbed] })
                    : interaction.reply({ embeds: [errorEmbed] });
            }

            const embed = createRankingEmbed(data, userName);
            const rows = createInteractionRows(null);

            const response = isSlashCommand
                ? await interaction.editReply({ embeds: [embed], components: rows })
                : await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

            await setupCollector(interaction, response, userName);

        } catch (error) {
            console.error('[Ohaasa] 명령어 실행 오류:', error);
            const errorEmbed = createEmbed({
                title: '❌ 오류가 발생했어요',
                description: '운세 데이터를 가져오는 중 문제가 발생했습니다.\n잠시 후 다시 시도해주세요.',
                color: 0xff6b6b
            });

            if (isSlashCommand) {
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed] });
                }
            } else {
                await interaction.reply({ embeds: [errorEmbed] });
            }
        }
    }
};

/**
 * 전체 랭킹 임베드 생성
 */
function createRankingEmbed(data, userName) {
    let description = '';

    for (const fortune of data.fortunes) {
        const emoji = ZODIAC_EMOJI[fortune.zodiacKo] || '⭐';
        const rankEmoji = getRankEmoji(fortune.rank);

        // 번역된 운세의 첫 줄만 표시
        const firstLine = fortune.fortune.split('\n')[0];
        description += `${rankEmoji} ${emoji} **${fortune.zodiacKo}**\n`;
        description += `┗ ${firstLine}\n\n`;
    }

    const translatedText = data.translated ? '🌐 한국어 번역됨' : '🇯🇵 원문';

    return createEmbed({
        title: `🌅 오하아사 오늘의 별자리 운세 (${data.date})`,
        description: description.trim(),
        footer: {
            text: `${userName}님이 조회 • ${translatedText} • 출처: おはよう朝日です (ABC)`
        },
        color: 0xff9500
    });
}

/**
 * 특정 별자리 운세 임베드 생성
 */
function createSingleFortuneEmbed(fortune, userName) {
    const emoji = ZODIAC_EMOJI[fortune.zodiacKo] || '⭐';
    const rankEmoji = getRankEmoji(fortune.rank);

    const langLabel = fortune.translated ? '🌐 한국어 번역' : '🇯🇵 일본어 원문';

    // 기본 필드
    const fields = [
        { name: '📅 날짜', value: fortune.date, inline: true },
        { name: '🏆 오늘 순위', value: `${fortune.rank}위 / 12위`, inline: true }
    ];

    // 럭키 아이템이 있을 경우에만 추가
    if (fortune.luckyItem) {
        // luckyItem이 객체인 경우 문자열로 변환
        let luckyItemText = fortune.luckyItem;
        if (typeof fortune.luckyItem === 'object') {
            const item = fortune.luckyItem;
            const parts = [];
            // 다양한 키 이름 지원
            const color = item.luckyColor || item.color || item.럭키컬러;
            const key = item.luckyKey || item.key || item.행운의열쇠;
            if (color) parts.push(`럭키컬러: ${color}`);
            if (key) parts.push(`행운의 열쇠: ${key}`);
            luckyItemText = parts.join(' / ') || JSON.stringify(fortune.luckyItem);
        }
        fields.push({ name: '🍀 럭키 아이템', value: luckyItemText, inline: false });
    }

    return createEmbed({
        title: `${emoji} ${fortune.zodiacKo} 오늘의 운세 ${rankEmoji}`,
        description: fortune.fortune,
        fields: fields,
        footer: {
            text: `${userName}님이 조회 • ${langLabel} • 출처: おはよう朝日です (ABC)`
        },
        color: fortune.rank <= 3 ? 0xffd700 : (fortune.rank >= 10 ? 0x808080 : 0xff9500)
    });
}

/**
 * 인터랙션 행 생성 (드롭다운만)
 */
function createInteractionRows(currentZodiac = null) {
    const zodiacs = getAllZodiacs();

    const options = zodiacs.map(z => ({
        label: `${ZODIAC_EMOJI[z.ko]} ${z.ko}`,
        description: z.dates,
        value: z.ko,
        default: z.ko === currentZodiac
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ohaasa_zodiac_select')
        .setPlaceholder('별자리를 선택하여 상세 운세 보기')
        .addOptions(options);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    return [selectRow];
}

/**
 * 인터랙션 컬렉터 설정
 */
async function setupCollector(interaction, response, userName) {
    const userId = interaction.user?.id || interaction.author?.id;

    const collector = response.createMessageComponentCollector({
        filter: i => i.customId === 'ohaasa_zodiac_select' && i.user.id === userId,
        time: 180000 // 3분
    });

    collector.on('collect', async i => {
        try {
            const selectedZodiac = i.values[0];
            const fortune = await getZodiacFortune(selectedZodiac);

            if (fortune) {
                const embed = createSingleFortuneEmbed(fortune, userName);
                const rows = createInteractionRows(selectedZodiac);
                await i.update({ embeds: [embed], components: rows });
            }
        } catch (error) {
            console.error('[Ohaasa] 인터랙션 오류:', error);
        }
    });

    collector.on('end', async () => {
        try {
            const disabledSelect = new StringSelectMenuBuilder()
                .setCustomId('ohaasa_zodiac_select_disabled')
                .setPlaceholder('시간 만료 - 다시 명령어를 입력해주세요')
                .setDisabled(true)
                .addOptions([{ label: '만료됨', value: 'expired' }]);

            const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);
            await response.edit({ components: [disabledRow] });
        } catch (e) {
            // 메시지가 이미 삭제된 경우 무시
        }
    });
}
