const { SlashCommandBuilder } = require('discord.js');
const workCommand = require('./work');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ㅌㄱ')
        .setDescription('퇴근까지 남은 시간과 응원 메시지를 보내요!'),

    cooldown: workCommand.cooldown,
    execute: workCommand.execute
};
