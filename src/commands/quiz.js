const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const quizData = require('../data/quizzes.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed, createSuccessEmbed, createErrorEmbed } = require('../utils/responseFormatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('퀴즈')
        .setDescription('재미있는 퀴즈를 풀어보세요!')
        .addStringOption(option =>
            option.setName('카테고리')
                .setDescription('퀴즈 카테고리를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '일반상식', value: 'general' },
                    { name: '프로그래밍', value: 'programming' },
                    { name: '과학', value: 'science' },
                    { name: '지리', value: 'geography' },
                    { name: '수학', value: 'math' }
                ))
        .addStringOption(option =>
            option.setName('난이도')
                .setDescription('퀴즈 난이도를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '쉬움', value: 'easy' },
                    { name: '보통', value: 'medium' },
                    { name: '어려움', value: 'hard' }
                )),
    
    name: '퀴즈',
    aliases: ['quiz', '문제', '퀴즈게임'],
    description: '재미있는 퀴즈를 풀어보세요!',
    usage: '[카테고리] [난이도]',
    cooldown: 5,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;
        const userName = isSlashCommand ? interaction.user.username : interaction.author.username;
        
        let category = null;
        let difficulty = null;
        
        if (isSlashCommand) {
            category = interaction.options.getString('카테고리');
            difficulty = interaction.options.getString('난이도');
        } else {
            const args = interaction.content.split(' ').slice(1);
            args.forEach(arg => {
                const lower = arg.toLowerCase();
                if (['general', '일반', '상식'].includes(lower)) category = 'general';
                else if (['programming', '프로그래밍', '코딩'].includes(lower)) category = 'programming';
                else if (['science', '과학'].includes(lower)) category = 'science';
                else if (['geography', '지리'].includes(lower)) category = 'geography';
                else if (['math', '수학'].includes(lower)) category = 'math';
                else if (['easy', '쉬움', '쉬운'].includes(lower)) difficulty = 'easy';
                else if (['medium', '보통', '중간'].includes(lower)) difficulty = 'medium';
                else if (['hard', '어려움', '어려운'].includes(lower)) difficulty = 'hard';
            });
        }
        
        let quizzes = quizData.quizzes;
        
        if (category) {
            quizzes = quizzes.filter(q => q.category === category);
        }
        
        if (difficulty) {
            quizzes = quizzes.filter(q => q.difficulty === difficulty);
        }
        
        if (quizzes.length === 0) {
            quizzes = quizData.quizzes;
        }
        
        const quiz = getRandomItem(quizzes);
        
        const difficultyEmoji = {
            'easy': '🟢',
            'medium': '🟡',
            'hard': '🔴'
        };
        
        const categoryEmoji = {
            'general': '🌍',
            'programming': '💻',
            'science': '🔬',
            'geography': '🗺️',
            'math': '🔢',
            'language': '🗣️',
            'history': '📜'
        };
        
        const embed = createEmbed({
            title: `${categoryEmoji[quiz.category] || '❓'} 퀴즈 타임!`,
            description: `**${quiz.question}**`,
            fields: [
                { name: '난이도', value: `${difficultyEmoji[quiz.difficulty]} ${quiz.difficulty}`, inline: true },
                { name: '카테고리', value: quiz.category, inline: true },
                { name: '제한시간', value: '30초', inline: true }
            ],
            footer: { text: '아래 버튼을 눌러 답을 선택하세요!' }
        });
        
        const shuffledOptions = [...quiz.options]
            .map((option, index) => ({ option, originalIndex: index }))
            .sort(() => Math.random() - 0.5);
        
        const row = new ActionRowBuilder();
        const buttonStyles = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];
        
        shuffledOptions.forEach((item, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`quiz_${item.originalIndex}`)
                    .setLabel(`${index + 1}. ${item.option}`)
                    .setStyle(buttonStyles[index])
            );
        });
        
        const response = isSlashCommand ?
            await interaction.reply({ embeds: [embed], components: [row] }) :
            await interaction.reply({ embeds: [embed], components: [row] });
        
        const message = isSlashCommand ? await interaction.fetchReply() : response;
        
        const collector = message.createMessageComponentCollector({ time: 30000 });
        
        const answeredUsers = new Map();
        let firstCorrect = null;
        
        collector.on('collect', async i => {
            if (answeredUsers.has(i.user.id)) {
                return i.reply({ 
                    content: '이미 답을 선택하셨어요!', 
                    ephemeral: true 
                });
            }
            
            const selectedAnswer = parseInt(i.customId.split('_')[1]);
            answeredUsers.set(i.user.id, selectedAnswer);
            
            if (selectedAnswer === quiz.answer) {
                if (!firstCorrect) firstCorrect = i.user.username;
                
                await i.reply({ 
                    content: '🎉 정답입니다! 축하해요!', 
                    ephemeral: true 
                });
            } else {
                await i.reply({ 
                    content: `❌ 틀렸어요! 정답은 ${quiz.answer + 1}번이었어요.`, 
                    ephemeral: true 
                });
            }
        });
        
        collector.on('end', async () => {
            row.components.forEach(button => button.setDisabled(true));
            
            const correctAnswerers = Array.from(answeredUsers.entries())
                .filter(([_, answer]) => answer === quiz.answer)
                .map(([userId, _]) => `<@${userId}>`);
            
            let resultEmbed;
            
            if (correctAnswerers.length > 0) {
                resultEmbed = createSuccessEmbed(
                    '퀴즈 종료!',
                    `정답은 **${quiz.answer + 1}번: ${quiz.options[quiz.answer]}** 이었습니다!\n\n` +
                    `🏆 정답자: ${correctAnswerers.join(', ')}\n` +
                    `${firstCorrect ? `⚡ 가장 빨리 맞춘 사람: **${firstCorrect}**` : ''}`
                );
            } else {
                resultEmbed = createErrorEmbed(
                    '퀴즈 종료!',
                    `정답은 **${quiz.answer + 1}번: ${quiz.options[quiz.answer]}** 이었습니다!\n\n` +
                    `아무도 맞추지 못했네요! 다음에 다시 도전해보세요! 😅`
                );
            }
            
            const newRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('quiz_replay')
                        .setLabel('다시 하기')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                );
            
            await message.edit({ embeds: [resultEmbed], components: [row, newRow] });
            
            const replayCollector = message.createMessageComponentCollector({ 
                filter: i => i.customId === 'quiz_replay' && i.user.id === userId,
                time: 30000,
                max: 1
            });
            
            replayCollector.on('collect', async i => {
                await i.deferUpdate();
                if (isSlashCommand) {
                    await module.exports.execute(interaction);
                } else {
                    interaction.content = '!퀴즈';
                    await module.exports.execute(interaction);
                }
            });
        });
    }
};