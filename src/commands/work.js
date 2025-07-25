const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const workData = require('../data/work.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('출근')
        .setDescription('출근하시는 분들께 응원의 메시지를 보내요!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('출근')
                .setDescription('출근 응원 메시지'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('야근')
                .setDescription('야근 응원 메시지')),
    
    name: '출근',
    aliases: ['야근', 'work', 'overtime'],
    description: '출근/야근 응원 메시지를 보내요!',
    cooldown: 3,
    
    async execute(interaction) {
        let isSlashCommand = interaction.isChatInputCommand && interaction.isChatInputCommand();
        let commandType;
        
        if (isSlashCommand) {
            commandType = interaction.options.getSubcommand();
        } else {
            const content = interaction.content.toLowerCase();
            if (content.includes('야근')) {
                commandType = '야근';
            } else {
                commandType = '출근';
            }
        }
        
        const userName = interaction.user ? interaction.user.username : interaction.author.username;
        let responseData, title, emoji;
        
        if (commandType === '야근') {
            responseData = workData.overtime;
            title = '🌙 야근 파이팅!';
            emoji = '💪';
        } else {
            responseData = workData.goingToWork;
            title = '🌅 출근 파이팅!';
            emoji = '🚀';
        }
        
        const encouragement = getRandomItem(responseData.encouragements);
        const tip = getRandomItem(responseData.tips);
        
        const embed = createEmbed({
            title: title,
            description: `${userName}님, ${encouragement}`,
            fields: [
                {
                    name: `${emoji} 오늘의 팁`,
                    value: tip,
                    inline: false
                }
            ],
            thumbnail: interaction.client.user.displayAvatarURL(),
            footer: { text: '규리봇이 응원해요! 화이팅!' }
        });
        
        if (isSlashCommand) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};