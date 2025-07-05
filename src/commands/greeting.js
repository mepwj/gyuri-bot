const { SlashCommandBuilder } = require('discord.js');
const greetingsData = require('../data/greetings.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('안녕')
        .setDescription('규리가 인사해요!'),
    
    name: '안녕',
    aliases: ['규리야', 'hello', 'hi'],
    description: '규리가 인사해요!',
    cooldown: 3,
    
    async execute(interaction) {
        const hour = new Date().getHours();
        let timeOfDay;
        let timeGreeting;
        
        if (hour >= 5 && hour < 12) {
            timeOfDay = 'morning';
            timeGreeting = greetingsData.responses.morning;
        } else if (hour >= 12 && hour < 17) {
            timeOfDay = 'afternoon';
            timeGreeting = greetingsData.responses.afternoon;
        } else if (hour >= 17 && hour < 21) {
            timeOfDay = 'evening';
            timeGreeting = greetingsData.responses.evening;
        } else {
            timeOfDay = 'night';
            timeGreeting = greetingsData.responses.night;
        }
        
        const generalGreeting = getRandomItem(greetingsData.greetings);
        const specificGreeting = getRandomItem(timeGreeting);
        
        const userName = interaction.user ? interaction.user.username : interaction.author.username;
        
        const embed = createEmbed({
            title: `${generalGreeting}`,
            description: `${userName}님, ${specificGreeting}`,
            thumbnail: interaction.client.user.displayAvatarURL(),
            footer: { text: '규리봇이 인사드려요!' }
        });
        
        if (interaction.isChatInputCommand) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};