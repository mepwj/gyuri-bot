const fs = require('fs');
const path = require('path');

module.exports = async (client) => {
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.log('⚠️ commands 폴더가 없어 생성을 건너뜁니다.');
        return;
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.slashCommands.set(command.data.name, command);
            console.log(`⚡ 슬래시 명령어 로드: /${command.data.name}`);
        }
        
        if ('name' in command && 'execute' in command) {
            client.commands.set(command.name, command);
            console.log(`💬 텍스트 명령어 로드: ${client.config.bot.prefix}${command.name}`);
        }
    }
    
    console.log(`✅ 총 ${client.slashCommands.size}개의 슬래시 명령어를 로드했어요!`);
    console.log(`✅ 총 ${client.commands.size}개의 텍스트 명령어를 로드했어요!`);
};