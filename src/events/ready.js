const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ ${client.user.tag}으로 로그인했어요!`);
        console.log(`📊 ${client.guilds.cache.size}개의 서버에서 활동 중!`);
        
        const activities = [
            { name: '!도움말로 명령어 확인', type: ActivityType.Playing },
            { name: '규리야! 하고 불러주세요', type: ActivityType.Listening },
            { name: `${client.guilds.cache.size}개 서버 돌보기`, type: ActivityType.Watching },
            { name: '여러분과 함께', type: ActivityType.Playing }
        ];
        
        let activityIndex = 0;
        
        const setActivity = () => {
            client.user.setActivity(activities[activityIndex]);
            activityIndex = (activityIndex + 1) % activities.length;
        };
        
        setActivity();
        setInterval(setActivity, 300000);
        
        console.log('🍊 규리봇이 준비됐어요!');
    }
};