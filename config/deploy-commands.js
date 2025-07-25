const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, '..', 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`📝 로드됨: ${command.data.name}`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🚀 ${commands.length}개의 슬래시 명령어를 등록하는 중...`);

        if (process.env.GUILD_ID) {
            // 길드 명령어 등록 (즉시 적용)
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ ${data.length}개의 길드 슬래시 명령어가 등록되었습니다!`);
        } else {
            // 전역 명령어 등록 (최대 1시간 소요)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ ${data.length}개의 전역 슬래시 명령어가 등록되었습니다!`);
            console.log('⏰ 전역 명령어는 모든 서버에 적용되기까지 최대 1시간이 소요될 수 있습니다.');
        }

        console.log('\n📋 등록된 명령어 목록:');
        commands.forEach(cmd => {
            console.log(`  /${cmd.name} - ${cmd.description}`);
        });

    } catch (error) {
        console.error('❌ 슬래시 명령어 등록 중 오류 발생:', error);
        console.error('\n🔍 문제 해결 방법:');
        console.error('1. DISCORD_TOKEN이 올바른지 확인하세요');
        console.error('2. CLIENT_ID가 올바른지 확인하세요');
        console.error('3. 봇이 서버에 초대되어 있는지 확인하세요');
        console.error('4. 봇에 applications.commands 권한이 있는지 확인하세요');
    }
})();