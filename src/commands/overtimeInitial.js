const { SlashCommandBuilder } = require('discord.js');
const workCommand = require('./work');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ㅇㄱ')
        .setDescription('야근 응원 메시지를 보내요!'),

    cooldown: workCommand.cooldown,
    execute: workCommand.execute
};
