const { SlashCommandBuilder } = require('discord.js');
const motivationData = require('../data/motivations.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');
const { generateMotivation } = require('../utils/llmGenerator');
const { getDisplayName } = require('../utils/userHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('파이팅')
        .setDescription('힘이 나는 응원 메시지를 보내드려요!')
        .addStringOption(option =>
            option.setName('상황')
                .setDescription('어떤 상황인가요?')
                .setRequired(false)
                .addChoices(
                    { name: '공부', value: 'study' },
                    { name: '일/업무', value: 'work' },
                    { name: '운동', value: 'exercise' },
                    { name: '힘들 때', value: 'emotional' }
                )),
    
    name: '파이팅',
    aliases: ['힘내', '화이팅', '응원', 'fighting'],
    description: '힘이 나는 응원 메시지를 보내드려요!',
    usage: '[상황]',
    cooldown: 3,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userName = getDisplayName(interaction);
        
        let category = 'general';
        let situation = null;
        
        if (isSlashCommand) {
            category = interaction.options.getString('상황') || 'general';
            situation = category;
        } else {
            const args = interaction.content.split(' ').slice(1);
            if (args.length > 0) {
                const keyword = args.join(' ').toLowerCase();
                if (keyword.includes('공부') || keyword.includes('시험')) category = 'study';
                else if (keyword.includes('일') || keyword.includes('업무') || keyword.includes('회사')) category = 'work';
                else if (keyword.includes('운동') || keyword.includes('헬스')) category = 'exercise';
                else if (keyword.includes('힘들') || keyword.includes('우울') || keyword.includes('슬프')) category = 'emotional';
                situation = keyword;
            }
        }
        
        let message;
        const llmMessage = await generateMotivation(situation);
        
        if (llmMessage && interaction.client.config.features.enableLLM) {
            message = llmMessage;
        } else {
            const messages = motivationData[category] || motivationData.general;
            message = getRandomItem(messages);
        }
        
        const categoryEmoji = {
            'general': '💪',
            'study': '📚',
            'work': '💼',
            'exercise': '🏃',
            'emotional': '🤗'
        };
        
        const embed = createEmbed({
            title: `${categoryEmoji[category]} ${userName}님, 힘내세요!`,
            description: message,
            footer: { text: '규리가 응원해요! 🍊' }
        });
        
        const responses = [
            '화이팅! 화이팅! 🔥',
            '할 수 있어요! 💪',
            '규리가 믿어요! ⭐',
            '최고예요! 👍',
            '응원할게요! 📣'
        ];
        
        const additionalMessage = getRandomItem(responses);
        
        if (isSlashCommand) {
            await interaction.reply({ 
                content: additionalMessage,
                embeds: [embed] 
            });
        } else {
            await interaction.reply({ 
                content: additionalMessage,
                embeds: [embed] 
            });
        }
    }
};