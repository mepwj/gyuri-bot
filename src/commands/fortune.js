const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed } = require('../utils/responseFormatter');
const { getDisplayName } = require('../utils/userHelper');
const { generateFortune } = require('../utils/fortuneGenerator');

const CATEGORIES = {
    '총운': { emoji: '🔮', description: '오늘 하루 전체 운세' },
    '애정운': { emoji: '💕', description: '연애·인간관계 운세' },
    '금전운': { emoji: '💰', description: '재물·금전 운세' },
    '건강운': { emoji: '💪', description: '건강·컨디션 운세' },
    '직장운': { emoji: '💼', description: '직장·학업 운세' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('운세')
        .setDescription('오늘의 운세를 알려드려요! 🔮')
        .addStringOption(option =>
            option.setName('카테고리')
                .setDescription('운세 카테고리를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '🔮 총운', value: '총운' },
                    { name: '💕 애정운', value: '애정운' },
                    { name: '💰 금전운', value: '금전운' },
                    { name: '💪 건강운', value: '건강운' },
                    { name: '💼 직장운', value: '직장운' }
                )),

    name: '운세',
    aliases: ['fortune', '오늘운세', '오늘의운세'],
    description: '오늘의 운세를 알려드려요!',
    cooldown: 5,

    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userName = getDisplayName(interaction);
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;

        // 카테고리 파싱
        let category = '총운';
        if (isSlashCommand) {
            category = interaction.options.getString('카테고리') || '총운';
        } else {
            const args = interaction.content.split(' ').slice(1);
            if (args.length > 0) {
                const input = args.join(' ');
                const found = Object.keys(CATEGORIES).find(c => input.includes(c));
                if (found) category = found;
            }
        }

        // 로딩
        if (isSlashCommand) {
            await interaction.deferReply();
        } else {
            await interaction.channel.sendTyping();
        }

        try {
            const fortune = await generateFortune(userName, userId, category);

            const catInfo = CATEGORIES[category];
            const embed = createEmbed({
                title: `${catInfo.emoji} ${userName}님의 오늘의 ${category}`,
                description: fortune.message,
                fields: [
                    { name: '운세 점수', value: `**${fortune.score}점**`, inline: false },
                    { name: '🎨 행운의 색', value: fortune.luckyColor, inline: true },
                    { name: '🔢 행운의 숫자', value: fortune.luckyNumber, inline: true },
                    { name: '🍽️ 행운의 음식', value: fortune.luckyFood, inline: true },
                    { name: '🧭 행운의 방향', value: fortune.luckyDirection, inline: true },
                    { name: '⏰ 행운의 시간대', value: fortune.luckyTime, inline: true },
                    { name: '💡 오늘의 조언', value: fortune.advice, inline: false }
                ],
                footer: { text: '오늘 하루도 화이팅! 🍊 · 하루에 카테고리별 1회' },
                color: getScoreColor(fortune.score)
            });

            // 카테고리 선택 드롭다운
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('fortune_category')
                .setPlaceholder('다른 카테고리 운세 보기')
                .addOptions(
                    Object.entries(CATEGORIES).map(([name, info]) => ({
                        label: `${info.emoji} ${name}`,
                        description: info.description,
                        value: name,
                        default: name === category
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = isSlashCommand
                ? await interaction.editReply({ embeds: [embed], components: [row] })
                : await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            // 드롭다운 인터랙션
            const collector = response.createMessageComponentCollector({
                filter: i => i.customId === 'fortune_category' && i.user.id === userId,
                time: 180000
            });

            collector.on('collect', async i => {
                try {
                    const newCategory = i.values[0];
                    const newCatInfo = CATEGORIES[newCategory];

                    await i.deferUpdate();

                    const newFortune = await generateFortune(userName, userId, newCategory);

                    const newEmbed = createEmbed({
                        title: `${newCatInfo.emoji} ${userName}님의 오늘의 ${newCategory}`,
                        description: newFortune.message,
                        fields: [
                            { name: '운세 점수', value: `**${newFortune.score}점**`, inline: false },
                            { name: '🎨 행운의 색', value: newFortune.luckyColor, inline: true },
                            { name: '🔢 행운의 숫자', value: newFortune.luckyNumber, inline: true },
                            { name: '🍽️ 행운의 음식', value: newFortune.luckyFood, inline: true },
                            { name: '🧭 행운의 방향', value: newFortune.luckyDirection, inline: true },
                            { name: '⏰ 행운의 시간대', value: newFortune.luckyTime, inline: true },
                            { name: '💡 오늘의 조언', value: newFortune.advice, inline: false }
                        ],
                        footer: { text: '오늘 하루도 화이팅! 🍊 · 하루에 카테고리별 1회' },
                        color: getScoreColor(newFortune.score)
                    });

                    const newSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('fortune_category')
                        .setPlaceholder('다른 카테고리 운세 보기')
                        .addOptions(
                            Object.entries(CATEGORIES).map(([name, info]) => ({
                                label: `${info.emoji} ${name}`,
                                description: info.description,
                                value: name,
                                default: name === newCategory
                            }))
                        );

                    const newRow = new ActionRowBuilder().addComponents(newSelectMenu);
                    await i.editReply({ embeds: [newEmbed], components: [newRow] });
                } catch (error) {
                    console.error('[Fortune] 인터랙션 오류:', error);
                }
            });

            collector.on('end', async () => {
                try {
                    const disabledMenu = new StringSelectMenuBuilder()
                        .setCustomId('fortune_category_disabled')
                        .setPlaceholder('시간 만료 - 다시 명령어를 입력해주세요')
                        .setDisabled(true)
                        .addOptions([{ label: '만료됨', value: 'expired' }]);
                    const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
                    await response.edit({ components: [disabledRow] });
                } catch (e) { /* 무시 */ }
            });

        } catch (error) {
            console.error('[Fortune] 명령어 실행 오류:', error);
            const errorEmbed = createEmbed({
                title: '❌ 오류가 발생했어요',
                description: '운세를 가져오는 중 문제가 발생했습니다.\n잠시 후 다시 시도해주세요.',
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

function getScoreColor(score) {
    if (score >= 75) return 0xffd700; // 금색
    if (score >= 25) return 0xff9500; // 주황
    if (score >= 0) return 0x4a90d9; // 파랑
    if (score >= -50) return 0x808080; // 회색
    return 0xff6b6b; // 빨강
}
