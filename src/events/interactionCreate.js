const { Events, Collection } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        
        const command = interaction.client.slashCommands.get(interaction.commandName);
        
        if (!command) {
            console.error(`❌ ${interaction.commandName} 명령어를 찾을 수 없습니다.`);
            return;
        }
        
        const { cooldowns } = interaction.client;
        
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = interaction.client.config.bot.cooldown;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;
        
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                const message = interaction.client.config.responses.error.cooldown
                    .replace('{time}', `<t:${expiredTimestamp}:R>`);
                    
                return interaction.reply({ 
                    content: message, 
                    ephemeral: true 
                });
            }
        }
        
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ ${command.data.name} 실행 중 오류:`, error);
            
            const errorMessage = interaction.client.config.responses.error.generic;
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: errorMessage, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: errorMessage, 
                    ephemeral: true 
                });
            }
        }
    }
};