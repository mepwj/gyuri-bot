const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const recommendData = require('../data/recommendations.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');
const { getDisplayName } = require('../utils/userHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('추천')
        .setDescription('재미있는 활동을 추천해드려요!')
        .addStringOption(option =>
            option.setName('종류')
                .setDescription('활동 종류를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '실내 활동', value: 'indoor' },
                    { name: '실외 활동', value: 'outdoor' },
                    { name: '소셜 활동', value: 'social' },
                    { name: '창작 활동', value: 'creative' },
                    { name: '휴식', value: 'relaxing' }
                )),
    
    name: '추천',
    aliases: ['뭐할까', 'recommend', '활동추천'],
    description: '재미있는 활동을 추천해드려요!',
    usage: '[활동종류]',
    cooldown: 3,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;
        const userName = getDisplayName(interaction);
        
        let category = null;
        
        if (isSlashCommand) {
            category = interaction.options.getString('종류');
        } else {
            const args = interaction.content.split(' ').slice(1);
            if (args[0]) {
                const keyword = args[0].toLowerCase();
                if (keyword.includes('실내')) category = 'indoor';
                else if (keyword.includes('실외') || keyword.includes('밖')) category = 'outdoor';
                else if (keyword.includes('친구') || keyword.includes('소셜')) category = 'social';
                else if (keyword.includes('창작') || keyword.includes('만들')) category = 'creative';
                else if (keyword.includes('휴식') || keyword.includes('쉬')) category = 'relaxing';
            }
        }
        
        if (!category) {
            category = getRandomItem(recommendData.categories);
        }
        
        const activities = recommendData.activities[category];
        const activity = getRandomItem(activities);

        const categoryInfo = {
            'indoor': { name: '실내 활동', emoji: '🏠' },
            'outdoor': { name: '실외 활동', emoji: '🌳' },
            'social': { name: '소셜 활동', emoji: '👥' },
            'creative': { name: '창작 활동', emoji: '🎨' },
            'relaxing': { name: '휴식', emoji: '😌' }
        };
        
        const info = categoryInfo[category];
        
        const embed = createEmbed({
            title: `${info.emoji} ${userName}님을 위한 ${info.name} 추천`,
            description: `**${activity.emoji} ${activity.name}**\n\n${activity.description}`,
            fields: [
                { name: '⏱️ 예상 시간', value: activity.duration, inline: true },
                { name: '📍 카테고리', value: info.name, inline: true }
            ],
            footer: { text: '즐거운 시간 보내세요! 🍊' }
        });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('recommend_category')
            .setPlaceholder('다른 카테고리 선택')
            .addOptions([
                {
                    label: '실내 활동',
                    description: '집에서 할 수 있는 활동',
                    value: 'indoor',
                    emoji: '🏠'
                },
                {
                    label: '실외 활동',
                    description: '밖에서 하는 활동',
                    value: 'outdoor',
                    emoji: '🌳'
                },
                {
                    label: '소셜 활동',
                    description: '사람들과 함께하는 활동',
                    value: 'social',
                    emoji: '👥'
                },
                {
                    label: '창작 활동',
                    description: '무언가를 만드는 활동',
                    value: 'creative',
                    emoji: '🎨'
                },
                {
                    label: '휴식',
                    description: '편안하게 쉬는 활동',
                    value: 'relaxing',
                    emoji: '😌'
                }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const response = isSlashCommand ?
            await interaction.reply({ embeds: [embed], components: [row] }) :
            await interaction.reply({ embeds: [embed], components: [row] });
        
        const message = isSlashCommand ? await interaction.fetchReply() : response;
        const collector = message.createMessageComponentCollector({ time: 60000 });
        
        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                return i.reply({ content: '다른 사람의 추천이에요!', ephemeral: true });
            }
            
            const newCategory = i.values[0];
            const newActivities = recommendData.activities[newCategory];
            const newActivity = getRandomItem(newActivities);
            const newInfo = categoryInfo[newCategory];
            
            const newEmbed = createEmbed({
                title: `${newInfo.emoji} ${userName}님을 위한 ${newInfo.name} 추천`,
                description: `**${newActivity.emoji} ${newActivity.name}**\n\n${newActivity.description}`,
                fields: [
                    { name: '⏱️ 예상 시간', value: newActivity.duration, inline: true },
                    { name: '📍 카테고리', value: newInfo.name, inline: true }
                ],
                footer: { text: '즐거운 시간 보내세요! 🍊' }
            });
            
            await i.update({ embeds: [newEmbed], components: [row] });
        });
        
        collector.on('end', () => {
            row.components[0].setDisabled(true);
        });
    }
};