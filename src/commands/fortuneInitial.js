const { SlashCommandBuilder } = require('discord.js');
const fortuneCommand = require('./fortune');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ㅇㅅ')
        .setDescription('오늘의 운세를 알려드려요! 🔮')
        .addStringOption(option =>
            option.setName('카테고리')
                .setDescription('운세 카테고리를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '🔮 총운', value: '총운' },
                    { name: '💕 애정운', value: '애정운' },
                    { name: '💰 금전운', value: '금전운' },
                    { name: '💪 건강운', value: '건강운' },
                    { name: '💼 직장운', value: '직장운' }
                )),

    cooldown: fortuneCommand.cooldown,
    execute: fortuneCommand.execute
};
