const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tipData = require('../data/tips.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('팁')
        .setDescription('유용한 팁을 알려드려요!')
        .addStringOption(option =>
            option.setName('카테고리')
                .setDescription('팁 카테고리를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '일상', value: 'daily' },
                    { name: '생산성', value: 'productivity' },
                    { name: '개발자', value: 'developer' },
                    { name: '소셜', value: 'social' }
                )),
    
    name: '팁',
    aliases: ['tip', '꿀팁', 'tips'],
    description: '유용한 팁을 알려드려요!',
    usage: '[카테고리]',
    cooldown: 3,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;
        
        let category = null;
        
        if (isSlashCommand) {
            category = interaction.options.getString('카테고리');
        } else {
            const args = interaction.content.split(' ').slice(1);
            if (args[0]) {
                const keyword = args[0].toLowerCase();
                if (keyword.includes('일상') || keyword.includes('daily')) category = 'daily';
                else if (keyword.includes('생산성') || keyword.includes('productivity')) category = 'productivity';
                else if (keyword.includes('개발') || keyword.includes('코딩')) category = 'developer';
                else if (keyword.includes('소셜') || keyword.includes('대화')) category = 'social';
            }
        }
        
        if (!category) {
            category = getRandomItem(tipData.categories);
        }
        
        const tips = tipData[category];
        const tip = getRandomItem(tips);
        
        const categoryInfo = {
            'daily': { name: '일상 팁', emoji: '🌟' },
            'productivity': { name: '생산성 팁', emoji: '⚡' },
            'developer': { name: '개발자 팁', emoji: '💻' },
            'social': { name: '소셜 팁', emoji: '💬' }
        };
        
        const info = categoryInfo[category];
        
        const embed = createEmbed({
            title: `${tip.emoji} ${info.name}`,
            description: `**${tip.tip}**`,
            fields: [
                { name: '📁 카테고리', value: tip.category, inline: true },
                { name: '🏷️ 분류', value: info.name, inline: true }
            ],
            footer: { text: '이 팁이 도움이 되었으면 좋겠어요! 🍊' }
        });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tip_new')
                    .setLabel('다른 팁 보기')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('tip_category')
                    .setLabel('카테고리별 팁')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📂'),
                new ButtonBuilder()
                    .setCustomId('tip_useful')
                    .setLabel('유용해요!')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👍')
            );
        
        const response = isSlashCommand ?
            await interaction.reply({ embeds: [embed], components: [row] }) :
            await interaction.reply({ embeds: [embed], components: [row] });
        
        const message = isSlashCommand ? await interaction.fetchReply() : response;
        const collector = message.createMessageComponentCollector({ time: 60000 });
        
        let usefulCount = 0;
        const usedUsers = new Set();
        
        collector.on('collect', async i => {
            if (i.customId === 'tip_new') {
                if (i.user.id !== userId) {
                    return i.reply({ content: '다른 사람의 팁이에요!', ephemeral: true });
                }
                
                const newTip = getRandomItem(tips.filter(t => t.tip !== tip.tip));
                
                const newEmbed = createEmbed({
                    title: `${newTip.emoji} ${info.name}`,
                    description: `**${newTip.tip}**`,
                    fields: [
                        { name: '📁 카테고리', value: newTip.category, inline: true },
                        { name: '🏷️ 분류', value: info.name, inline: true }
                    ],
                    footer: { text: `이 팁이 도움이 되었으면 좋겠어요! 🍊 ${usefulCount > 0 ? `(👍 ${usefulCount}명이 유용하다고 했어요!)` : ''}` }
                });
                
                await i.update({ embeds: [newEmbed], components: [row] });
                
            } else if (i.customId === 'tip_category') {
                if (i.user.id !== userId) {
                    return i.reply({ content: '다른 사람의 팁이에요!', ephemeral: true });
                }
                
                const categoryList = tipData.categories.map(cat => {
                    const catInfo = categoryInfo[cat];
                    return `${catInfo.emoji} **${catInfo.name}**`;
                }).join('\n');
                
                await i.reply({ 
                    content: `📂 **사용 가능한 카테고리:**\n${categoryList}\n\n\`!팁 [카테고리]\`로 특정 카테고리의 팁을 볼 수 있어요!`, 
                    ephemeral: true 
                });
                
            } else if (i.customId === 'tip_useful') {
                if (!usedUsers.has(i.user.id)) {
                    usedUsers.add(i.user.id);
                    usefulCount++;
                    await i.reply({ 
                        content: '👍 이 팁이 도움이 되었다니 기뻐요!', 
                        ephemeral: true 
                    });
                } else {
                    await i.reply({ 
                        content: '이미 평가하셨어요!', 
                        ephemeral: true 
                    });
                }
            }
        });
        
        collector.on('end', () => {
            row.components.forEach(button => button.setDisabled(true));
        });
    }
};