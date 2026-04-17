const { SlashCommandBuilder } = require('discord.js');
const workCommand = require('./work');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ㅊㄱ')
        .setDescription('출근 응원 메시지를 보내요!'),

    cooldown: workCommand.cooldown,
    execute: workCommand.execute
};
