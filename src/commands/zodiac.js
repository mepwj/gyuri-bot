const { SlashCommandBuilder } = require('discord.js');
const ohaasa = require('./ohaasa');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('별자리')
        .setDescription('오늘의 별자리 운세! (오하아사)')
        .addStringOption(option =>
            option.setName('별자리')
                .setDescription('특정 별자리 운세만 보기')
                .setRequired(false)
                .addChoices(
                    { name: '♈ 양자리 (3/21~4/19)', value: '양자리' },
                    { name: '♉ 황소자리 (4/20~5/20)', value: '황소자리' },
                    { name: '♊ 쌍둥이자리 (5/21~6/21)', value: '쌍둥이자리' },
                    { name: '♋ 게자리 (6/22~7/22)', value: '게자리' },
                    { name: '♌ 사자자리 (7/23~8/22)', value: '사자자리' },
                    { name: '♍ 처녀자리 (8/23~9/22)', value: '처녀자리' },
                    { name: '♎ 천칭자리 (9/23~10/23)', value: '천칭자리' },
                    { name: '♏ 전갈자리 (10/24~11/21)', value: '전갈자리' },
                    { name: '♐ 궁수자리 (11/22~12/21)', value: '궁수자리' },
                    { name: '♑ 염소자리 (12/22~1/19)', value: '염소자리' },
                    { name: '♒ 물병자리 (1/20~2/18)', value: '물병자리' },
                    { name: '♓ 물고기자리 (2/19~3/20)', value: '물고기자리' }
                )),

    name: '별자리',
    aliases: [],
    description: '오늘의 별자리 운세!',
    usage: '[별자리]',
    cooldown: 5,

    execute: ohaasa.execute
};
