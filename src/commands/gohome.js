const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils/responseFormatter');
const { getRandomItem } = require('../utils/randomSelector');
const { getDisplayName } = require('../utils/userHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('퇴근')
        .setDescription('퇴근 시간까지 남은 시간을 알려드려요!'),
    
    name: '퇴근',
    aliases: ['집가고싶다', 'gohome', '퇴근시간'],
    description: '퇴근 시간까지 남은 시간을 알려드려요!',
    cooldown: 3,
    
    async execute(interaction) {
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + kstOffset);
        
        const targetHour = 18;
        const targetMinute = 0;
        
        let targetTime = new Date(kstNow);
        targetTime.setHours(targetHour, targetMinute, 0, 0);
        
        if (kstNow >= targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const diffMs = targetTime - kstNow;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const isWeekend = kstNow.getDay() === 0 || kstNow.getDay() === 6;
        const currentHour = kstNow.getHours();
        
        let title, description, color;
        
        if (currentHour >= 18 || currentHour < 9) {
            title = '🏠 이미 퇴근 시간이에요!';
            description = '오늘도 수고하셨어요! 푹 쉬세요~ 😊';
            color = '#00FF00';
        } else if (isWeekend) {
            title = '🎉 오늘은 주말이에요!';
            description = '주말인데 일하고 계신가요? 얼른 쉬세요! 😊';
            color = '#FFD700';
        } else {
            const encouragements = [
                '조금만 더 힘내세요! 할 수 있어요! 💪',
                '오늘도 수고 많으셨어요! 곧 퇴근이에요! 🎯',
                '파이팅! 조금만 더 버티면 집이에요! 🏃‍♂️',
                '규리가 응원할게요! 힘내세요! 🍊',
                '커피 한 잔 하고 힘내요! ☕',
                '곧 퇴근이니까 조금만 더 화이팅! 🔥',
                '오늘 하루도 거의 다 왔어요! 👏',
                '집에 가면 맛있는 거 먹어요! 🍽️',
                '조금만 더! 당신은 할 수 있어요! ⭐',
                '퇴근 후 계획 세우면서 버텨요! 📝'
            ];
            
            const progressEmojis = {
                morning: '🌅',
                midday: '☀️',
                afternoon: '🌇',
                almostDone: '🌆'
            };
            
            let timeEmoji;
            if (currentHour < 12) timeEmoji = progressEmojis.morning;
            else if (currentHour < 14) timeEmoji = progressEmojis.midday;
            else if (currentHour < 16) timeEmoji = progressEmojis.afternoon;
            else timeEmoji = progressEmojis.almostDone;
            
            title = `${timeEmoji} 퇴근까지 ${diffHours}시간 ${diffMinutes}분 남았어요!`;
            
            const totalWorkMinutes = 9 * 60;
            const workedMinutes = (currentHour - 9) * 60 + kstNow.getMinutes();
            const progress = Math.min(Math.max((workedMinutes / totalWorkMinutes) * 100, 0), 100);
            
            const progressBar = createProgressBar(progress);
            const encouragement = getRandomItem(encouragements);
            
            description = `${progressBar} ${progress.toFixed(0)}%\n\n${encouragement}`;
            
            if (diffHours === 0 && diffMinutes <= 30) {
                color = '#FF6B6B';
                description += '\n\n🎊 거의 다 왔어요! 마지막 스퍼트!';
            } else if (diffHours <= 1) {
                color = '#FFA500';
            } else if (diffHours <= 3) {
                color = '#FFFF00';
            } else {
                color = '#87CEEB';
            }
        }
        
        const userName = getDisplayName(interaction);
        
        const embed = createEmbed({
            title: title,
            description: description,
            color: color,
            fields: [
                {
                    name: '📅 현재 시간',
                    value: `${kstNow.toLocaleString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                    })}`,
                    inline: true
                },
                {
                    name: '🏁 퇴근 시간',
                    value: '오후 6:00',
                    inline: true
                }
            ],
            footer: { text: `${userName}님, 오늘도 고생 많으셨어요!` }
        });
        
        if (interaction.isChatInputCommand) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};

function createProgressBar(percentage) {
    const filled = '█';
    const empty = '░';
    const length = 20;
    const filledLength = Math.round((percentage / 100) * length);
    const emptyLength = length - filledLength;
    
    return `[${filled.repeat(filledLength)}${empty.repeat(emptyLength)}]`;
}