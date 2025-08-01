const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fortuneData = require('../data/fortunes.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');
const { generateFortune } = require('../utils/llmGenerator');
const { getDisplayName } = require('../utils/userHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('운세')
        .setDescription('오늘의 운세를 알려드려요!')
        .addStringOption(option =>
            option.setName('카테고리')
                .setDescription('운세 카테고리를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '일반', value: 'general' },
                    { name: '개발', value: 'developer' },
                    { name: '연애', value: 'love' },
                    { name: '학업', value: 'study' },
                    { name: '건강', value: 'health' }
                )),
    
    name: '운세',
    aliases: ['fortune', '오늘운세', '개발운세'],
    description: '오늘의 운세를 알려드려요!',
    usage: '[카테고리]',
    cooldown: 5,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userName = getDisplayName(interaction);
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;
        
        let category = 'general';
        
        if (isSlashCommand) {
            category = interaction.options.getString('카테고리') || 'general';
        } else {
            const args = interaction.content.split(' ').slice(1);
            if (args[0] === '개발' || interaction.content.includes('개발운세')) {
                category = 'developer';
            }
        }
        
        let fortune;
        let luckyItem;
        let luckyNumber;
        let emoji;
        
        const llmFortune = await generateFortune(userName);
        
        if (llmFortune && interaction.client.config.features.enableLLM) {
            fortune = llmFortune;
            emoji = '🔮';
            luckyItem = getRandomItem(['행운의 부적', '네잎클로버', '별똥별', '무지개']);
            luckyNumber = Math.floor(Math.random() * 100) + 1;
        } else {
            const fortuneCategory = fortuneData[category] || fortuneData.general;
            const selectedFortune = getRandomItem(fortuneCategory);
            
            fortune = selectedFortune.fortune;
            luckyItem = selectedFortune.lucky_item;
            luckyNumber = selectedFortune.lucky_number || Math.floor(Math.random() * 10) + 1;
            emoji = selectedFortune.emoji;
        }
        
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
            const newCategory = fortuneData.categories[Math.floor(Math.random() * fortuneData.categories.length)];
            const newFortune = getRandomItem(fortuneData[newCategory] || fortuneData.general);
            
            const newEmbed = createEmbed({
                title: `${newFortune.emoji} ${userName}님의 다른 운세`,
                description: newFortune.fortune,
                fields: [
                    { name: '카테고리', value: newCategory, inline: true },
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