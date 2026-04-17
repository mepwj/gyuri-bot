const { Events, Collection } = require('discord.js');
const { generateAIResponse } = require('../utils/aiChat');
const { getDisplayName } = require('../utils/userHelper');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        
        const { client } = message;
        const prefix = client.config.bot.prefix;

        const gyuriMessage = getGyuriTriggerMessage(message, client);
        if (gyuriMessage !== null) {
            if (gyuriMessage) {
                const channelMessages = await getRecentChannelMessages(message);

                await message.channel.sendTyping();
                const aiResponse = await generateAIResponse(
                    gyuriMessage,
                    getDisplayName(message),
                    message.author.id,
                    channelMessages
                );

                if (aiResponse) {
                    setTimeout(() => {
                        message.reply(aiResponse);
                    }, 1000);
                    return;
                }
            }

            return message.reply(getDefaultGyuriResponse());
        }
        
        if (!message.content.startsWith(prefix)) return;
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = client.commands.get(commandName) 
            || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) return;
        
        if (command.guildOnly && message.channel.type === 'DM') {
            return message.reply('이 명령어는 서버에서만 사용할 수 있어요! 😅');
        }
        
        if (command.permissions) {
            const authorPerms = message.channel.permissionsFor(message.author);
            if (!authorPerms || !authorPerms.has(command.permissions)) {
                return message.reply(client.config.responses.error.permission);
            }
        }
        
        if (command.args && !args.length) {
            let reply = `명령어 사용법이 올바르지 않아요! 😅`;
            
            if (command.usage) {
                reply += `\n올바른 사용법: \`${prefix}${command.name} ${command.usage}\``;
            }
            
            return message.reply(reply);
        }
        
        const { cooldowns } = client;
        
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || client.config.bot.cooldown) * 1000;
        
        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(
                    client.config.responses.error.cooldown.replace('{time}', timeLeft.toFixed(1))
                );
            }
        }
        
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        
        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(`❌ ${command.name} 실행 중 오류:`, error);
            message.reply(client.config.responses.error.generic);
        }
    }
};

function getGyuriTriggerMessage(message, client) {
    const mentionsBot = message.mentions.users.has(client.user.id);
    const includesGyuri = message.content.includes('규리');

    if (!mentionsBot && !includesGyuri) return null;

    return message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .replace(/^\s*!?\s*규리(?:야|봇)?[\s,!?~:：-]*/u, '')
        .trim();
}

async function getRecentChannelMessages(message) {
    try {
        const fetched = await message.channel.messages.fetch({ limit: 11 });
        return [...fetched.values()]
            .reverse()
            .filter(m => m.id !== message.id)
            .slice(-10)
            .map(m => ({
                author: m.author.bot ? '규리봇' : getDisplayName(m),
                content: m.content
            }));
    } catch (e) {
        return [];
    }
}

function getDefaultGyuriResponse() {
    const responses = [
        '네? 부르셨나요? 🍊',
        '저 여기 있어요! ✨',
        '무엇을 도와드릴까요? 😊',
        '규리 등장! 🎉'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}
