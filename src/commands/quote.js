const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const quoteData = require('../data/quotes.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('명언')
        .setDescription('영감을 주는 명언을 알려드려요!')
        .addStringOption(option =>
            option.setName('카테고리')
                .setDescription('명언 카테고리를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '동기부여', value: 'motivation' },
                    { name: '성장', value: 'growth' },
                    { name: '행복', value: 'happiness' },
                    { name: '인생', value: 'life' },
                    { name: '노력', value: 'effort' }
                )),
    
    name: '명언',
    aliases: ['quote', '좋은말', '격언'],
    description: '영감을 주는 명언을 알려드려요!',
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
                const categoryMap = {
                    '동기부여': 'motivation',
                    '성장': 'growth',
                    '행복': 'happiness',
                    '인생': 'life',
                    '노력': 'effort'
                };
                category = categoryMap[args[0]] || null;
            }
        }
        
        let selectedQuotes = quoteData.quotes;
        if (category) {
            selectedQuotes = quoteData.quotes.filter(q => q.category === category);
        }
        
        const quote = getRandomItem(selectedQuotes);
        
        const categoryEmoji = {
            'motivation': '🔥',
            'growth': '🌱',
            'kindness': '💝',
            'dream': '🌟',
            'perseverance': '💪',
            'happiness': '😊',
            'life': '🌈',
            'effort': '🎯',
            'future': '🚀',
            'confidence': '✨',
            'failure': '🌅',
            'daily': '☀️',
            'self-worth': '💎',
            'improvement': '📈',
            'smile': '😄'
        };
        
        const emoji = categoryEmoji[quote.category] || '📖';
        
        const embed = createEmbed({
            title: `${emoji} 오늘의 명언`,
            description: `**"${quote.text}"**`,
            fields: [
                { name: '✍️ 작성자', value: quote.author, inline: true },
                { name: '📁 카테고리', value: quote.category, inline: true }
            ],
            footer: { text: '이 명언이 도움이 되었길 바라요! 🍊' }
        });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quote_new')
                    .setLabel('다른 명언 보기')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('quote_save')
                    .setLabel('마음에 들어요')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💖')
            );
        
        const response = isSlashCommand ?
            await interaction.reply({ embeds: [embed], components: [row] }) :
            await interaction.reply({ embeds: [embed], components: [row] });
        
        const message = isSlashCommand ? await interaction.fetchReply() : response;
        const collector = message.createMessageComponentCollector({ time: 60000 });
        
        let likedCount = 0;
        
        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                return i.reply({ content: '다른 사람의 명언이에요!', ephemeral: true });
            }
            
            if (i.customId === 'quote_new') {
                const newQuote = getRandomItem(selectedQuotes.filter(q => q.text !== quote.text));
                const newEmoji = categoryEmoji[newQuote.category] || '📖';
                
                const newEmbed = createEmbed({
                    title: `${newEmoji} 새로운 명언`,
                    description: `**"${newQuote.text}"**`,
                    fields: [
                        { name: '✍️ 작성자', value: newQuote.author, inline: true },
                        { name: '📁 카테고리', value: newQuote.category, inline: true }
                    ],
                    footer: { text: `이 명언이 도움이 되었길 바라요! 🍊 ${likedCount > 0 ? `(💖 ${likedCount})` : ''}` }
                });
                
                await i.update({ embeds: [newEmbed], components: [row] });
            } else if (i.customId === 'quote_save') {
                likedCount++;
                await i.reply({ 
                    content: '💖 이 명언을 마음에 새겨두세요!', 
                    ephemeral: true 
                });
            }
        });
        
        collector.on('end', () => {
            row.components.forEach(button => button.setDisabled(true));
        });
    }
};