require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('../config/config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection();
client.config = config;

const loadHandlers = async () => {
    const eventHandler = require('./handlers/eventHandler');
    const commandHandler = require('./handlers/commandHandler');
    
    await eventHandler(client);
    await commandHandler(client);
};

const init = async () => {
    try {
        console.log(`🍊 ${config.bot.name} v${config.bot.version} 시작 중...`);
        
        await loadHandlers();
        
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('❌ 봇 시작 중 오류 발생:', error);
        process.exit(1);
    }
};

process.on('unhandledRejection', (error) => {
    console.error('처리되지 않은 Promise 거부:', error);
});

process.on('SIGINT', () => {
    console.log('\n🍊 규리봇을 종료합니다...');
    client.destroy();
    process.exit(0);
});

init();