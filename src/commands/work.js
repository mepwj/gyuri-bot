const { SlashCommandBuilder } = require('discord.js');
const workData = require('../data/work.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');
const { getDisplayName } = require('../utils/userHelper');

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
                .setDescription('야근 응원 메시지'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('퇴근')
                .setDescription('퇴근 응원 메시지')),

    name: '출근',
    aliases: ['ㅊㄱ', '야근', 'ㅇㄱ', '퇴근', 'ㅌㄱ', 'work', 'overtime', 'offwork', 'gohome'],
    description: '출근/야근/퇴근 응원 메시지를 보내요!',
    cooldown: 3,

    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand && interaction.isChatInputCommand();
        const commandType = getCommandType(interaction, isSlashCommand);

        const userName = getDisplayName(interaction);
        let responseData, title, emoji, description, footer;

        if (commandType === '야근') {
            responseData = workData.overtime;
            title = '🌙 야근 파이팅!';
            emoji = '💪';
            footer = '규리봇이 응원해요! 무리하지 말고 안전하게!';
        } else if (commandType === '퇴근') {
            responseData = workData.offWork;
            title = '🏠 퇴근 체크!';
            emoji = '🍊';
            description = `${userName}님, ${getOffWorkStatus()}`;
            footer = '오늘도 수고 많으셨어요!';
        } else {
            responseData = workData.goingToWork;
            title = '🌅 출근 파이팅!';
            emoji = '🚀';
            footer = '규리봇이 응원해요! 화이팅!';
        }

        const encouragement = getRandomItem(responseData.encouragements);
        const tip = getRandomItem(responseData.tips);
        const embedDescription = description
            ? `${description}\n\n${encouragement}`
            : `${userName}님, ${encouragement}`;

        const embed = createEmbed({
            title: title,
            description: embedDescription,
            fields: [
                {
                    name: `${emoji} 오늘의 팁`,
                    value: tip,
                    inline: false
                }
            ],
            thumbnail: interaction.client.user.displayAvatarURL(),
            footer: { text: footer }
        });
        
        if (isSlashCommand) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};

function getCommandType(interaction, isSlashCommand) {
    if (isSlashCommand) {
        if (interaction.commandName === '야근' || interaction.commandName === 'ㅇㄱ') return '야근';
        if (interaction.commandName === '퇴근' || interaction.commandName === 'ㅌㄱ') return '퇴근';
        if (interaction.commandName === 'ㅊㄱ') return '출근';

        return interaction.options.getSubcommand(false) || '출근';
    }

    const prefix = interaction.client.config.bot.prefix;
    const commandName = interaction.content
        .slice(prefix.length)
        .trim()
        .split(/ +/)[0]
        .toLowerCase();

    if (['야근', 'ㅇㄱ', 'overtime'].includes(commandName)) return '야근';
    if (['퇴근', 'ㅌㄱ', 'offwork', 'gohome'].includes(commandName)) return '퇴근';
    return '출근';
}

function getOffWorkStatus() {
    const parts = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    }).formatToParts(new Date());

    const hour = Number(parts.find(part => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find(part => part.type === 'minute')?.value || 0);
    const minutesUntilOffWork = (18 * 60) - (hour * 60 + minute);

    if (minutesUntilOffWork <= 0) {
        return '이미 퇴근 시간이 지났어요. 남은 건 편하게 쉬는 일뿐이에요! 🎉';
    }

    const hours = Math.floor(minutesUntilOffWork / 60);
    const minutes = minutesUntilOffWork % 60;

    if (hours === 0) {
        return `퇴근까지 약 ${minutes}분 남았어요. 마지막만 차분히 마무리해요!`;
    }

    return `퇴근까지 약 ${hours}시간 ${minutes}분 남았어요. 조금만 더 힘내요!`;
}
