const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const jokeData = require('../data/jokes.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');
const { generateJoke } = require('../utils/llmGenerator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('농담')
        .setDescription('재미있는 농담을 들려드려요!')
        .addStringOption(option =>
            option.setName('종류')
                .setDescription('농담 종류를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '개발자 농담', value: 'developer' },
                    { name: '언어유희', value: 'wordplay' },
                    { name: '아재개그', value: 'pun' }
                )),
    
    name: '농담',
    aliases: ['joke', '아재개그', '개그'],
    description: '재미있는 농담을 들려드려요!',
    usage: '[종류]',
    cooldown: 3,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;
        
        let category = null;
        
        if (isSlashCommand) {
            category = interaction.options.getString('종류');
        } else {
            const args = interaction.content.split(' ').slice(1);
            if (args[0]) {
                const keyword = args[0].toLowerCase();
                if (keyword.includes('개발') || keyword.includes('코딩')) category = 'developer';
                else if (keyword.includes('언어') || keyword.includes('말장난')) category = 'wordplay';
                else if (keyword.includes('아재')) category = 'pun';
            }
        }
        
        let joke;
        let isOneLiner = false;
        
        const llmJoke = await generateJoke(category);
        
        if (llmJoke && interaction.client.config.features.enableLLM) {
            joke = {
                setup: llmJoke,
                punchline: '',
                category: category || 'general'
            };
            isOneLiner = true;
        } else {
            if (Math.random() < 0.3) {
                joke = {
                    setup: getRandomItem(jokeData.oneLiner),
                    punchline: '',
                    category: 'general'
                };
                isOneLiner = true;
            } else {
                let jokes = jokeData.jokes;
                if (category) {
                    jokes = jokes.filter(j => j.category === category);
                }
                joke = getRandomItem(jokes);
            }
        }
        
        const categoryEmoji = {
            'developer': '💻',
            'wordplay': '📝',
            'pun': '😄',
            'general': '🎭'
        };
        
        const emoji = categoryEmoji[joke.category] || '😄';
        
        let embed;
        
        if (isOneLiner) {
            embed = createEmbed({
                title: `${emoji} 규리의 농담`,
                description: joke.setup,
                footer: { text: '웃어주세요! 🍊' }
            });
        } else {
            embed = createEmbed({
                title: `${emoji} 규리의 농담`,
                description: `**${joke.setup}**`,
                fields: [
                    { name: '🥁 정답은...', value: `||${joke.punchline}||`, inline: false }
                ],
                footer: { text: '스포일러를 클릭해서 답을 확인하세요! 🍊' }
            });
        }
        
        const reactions = ['😂', '🤣', '😄', '😆', '🤭'];
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('joke_new')
                    .setLabel('다른 농담')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('joke_laugh')
                    .setLabel('웃겼어요!')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('😂'),
                new ButtonBuilder()
                    .setCustomId('joke_groan')
                    .setLabel('...썰렁해요')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('😑')
            );
        
        const response = isSlashCommand ?
            await interaction.reply({ embeds: [embed], components: [row] }) :
            await interaction.reply({ embeds: [embed], components: [row] });
        
        const message = isSlashCommand ? await interaction.fetchReply() : response;
        
        for (const reaction of reactions.slice(0, 3)) {
            await message.react(reaction);
        }
        
        const collector = message.createMessageComponentCollector({ time: 60000 });
        
        let laughCount = 0;
        let groanCount = 0;
        const reactedUsers = new Set();
        
        collector.on('collect', async i => {
            if (i.customId === 'joke_new') {
                if (i.user.id !== userId) {
                    return i.reply({ content: '다른 사람의 농담이에요!', ephemeral: true });
                }
                
                let newJoke;
                if (Math.random() < 0.3) {
                    newJoke = {
                        setup: getRandomItem(jokeData.oneLiner),
                        punchline: '',
                        category: 'general'
                    };
                    isOneLiner = true;
                } else {
                    let jokes = jokeData.jokes;
                    if (category) {
                        jokes = jokes.filter(j => j.category === category);
                    }
                    newJoke = getRandomItem(jokes.filter(j => j.setup !== joke.setup));
                    isOneLiner = false;
                }
                
                const newEmoji = categoryEmoji[newJoke.category] || '😄';
                
                let newEmbed;
                if (isOneLiner) {
                    newEmbed = createEmbed({
                        title: `${newEmoji} 새로운 농담`,
                        description: newJoke.setup,
                        footer: { text: `웃어주세요! 🍊 ${laughCount > 0 ? `(😂 ${laughCount}명)` : ''} ${groanCount > 0 ? `(😑 ${groanCount}명)` : ''}` }
                    });
                } else {
                    newEmbed = createEmbed({
                        title: `${newEmoji} 새로운 농담`,
                        description: `**${newJoke.setup}**`,
                        fields: [
                            { name: '🥁 정답은...', value: `||${newJoke.punchline}||`, inline: false }
                        ],
                        footer: { text: `스포일러를 클릭해서 답을 확인하세요! 🍊 ${laughCount > 0 ? `(😂 ${laughCount}명)` : ''} ${groanCount > 0 ? `(😑 ${groanCount}명)` : ''}` }
                    });
                }
                
                await i.update({ embeds: [newEmbed], components: [row] });
                
            } else if (i.customId === 'joke_laugh') {
                if (!reactedUsers.has(i.user.id)) {
                    reactedUsers.add(i.user.id);
                    laughCount++;
                    await i.reply({ 
                        content: '😂 웃어주셔서 감사해요!', 
                        ephemeral: true 
                    });
                } else {
                    await i.reply({ 
                        content: '이미 반응하셨어요!', 
                        ephemeral: true 
                    });
                }
                
            } else if (i.customId === 'joke_groan') {
                if (!reactedUsers.has(i.user.id)) {
                    reactedUsers.add(i.user.id);
                    groanCount++;
                    await i.reply({ 
                        content: '😅 다음엔 더 재미있는 농담을 준비할게요...', 
                        ephemeral: true 
                    });
                } else {
                    await i.reply({ 
                        content: '이미 반응하셨어요!', 
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