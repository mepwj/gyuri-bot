const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fortuneData = require('../data/fortunes.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');
const { getDisplayName } = require('../utils/userHelper');

// 모든 카테고리의 운세를 하나로 합침
const allFortunes = fortuneData.categories.flatMap(cat => fortuneData[cat] || []);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('운세')
        .setDescription('오늘의 운세를 알려드려요!'),

    name: '운세',
    aliases: ['fortune', '오늘운세'],
    description: '오늘의 운세를 알려드려요!',
    cooldown: 5,

    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userName = getDisplayName(interaction);
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;

        const selectedFortune = getRandomItem(allFortunes);

        const fortune = selectedFortune.fortune;
        const luckyItem = selectedFortune.lucky_item;
        const luckyNumber = selectedFortune.lucky_number || Math.floor(Math.random() * 10) + 1;
        const emoji = selectedFortune.emoji;
        
        const fortuneScore = Math.floor(Math.random() * 101);
        
        const embed = createEmbed({
            title: `${emoji} ${userName}님의 오늘 운세`,
            description: fortune,
            fields: [
                { name: '행운 지수', value: `${fortuneScore}점 / 100점`, inline: true },
                { name: '행운의 아이템', value: luckyItem, inline: true },
                { name: '행운의 숫자', value: luckyNumber.toString(), inline: true }
            ],
            footer: { text: '오늘도 좋은 하루 되세요!' }
        });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fortune_refresh')
                    .setLabel('다른 운세 보기')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
            );
        
        if (isSlashCommand) {
            await interaction.reply({ embeds: [embed], components: [row] });
        } else {
            await interaction.reply({ embeds: [embed], components: [row] });
        }
        
        const filter = i => i.customId === 'fortune_refresh' && i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
        
        collector.on('collect', async i => {
            const newFortune = getRandomItem(allFortunes);
            const newFortuneScore = Math.floor(Math.random() * 101);

            const newEmbed = createEmbed({
                title: `${newFortune.emoji} ${userName}님의 다른 운세`,
                description: newFortune.fortune,
                fields: [
                    { name: '행운 지수', value: `${newFortuneScore}점 / 100점`, inline: true },
                    { name: '행운의 아이템', value: newFortune.lucky_item, inline: true },
                    { name: '행운의 숫자', value: (newFortune.lucky_number || Math.floor(Math.random() * 10) + 1).toString(), inline: true }
                ],
                footer: { text: '오늘도 좋은 하루 되세요!' }
            });

            await i.update({ embeds: [newEmbed] });
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                row.components[0].setDisabled(true);
            }
        });
    }
};