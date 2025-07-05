const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed } = require('../utils/responseFormatter');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('도움말')
        .setDescription('규리봇의 명령어 목록을 보여드려요!')
        .addStringOption(option =>
            option.setName('명령어')
                .setDescription('특정 명령어의 상세 정보를 확인')
                .setRequired(false)),
    
    name: '도움말',
    aliases: ['help', '명령어', 'commands'],
    description: '규리봇의 명령어 목록을 보여드려요!',
    usage: '[명령어이름]',
    cooldown: 3,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const client = interaction.client;
        const prefix = client.config.bot.prefix;
        
        let specificCommand = null;
        if (isSlashCommand) {
            specificCommand = interaction.options.getString('명령어');
        } else {
            const args = interaction.content.split(' ').slice(1);
            specificCommand = args[0];
        }
        
        if (specificCommand) {
            const command = client.commands.get(specificCommand) || 
                          client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(specificCommand));
            
            if (!command) {
                const errorEmbed = createEmbed({
                    title: '❌ 명령어를 찾을 수 없어요',
                    description: `\`${specificCommand}\` 명령어는 존재하지 않아요!`,
                    color: '#FF0000'
                });
                
                return isSlashCommand ? 
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true }) :
                    await interaction.reply({ embeds: [errorEmbed] });
            }
            
            const detailEmbed = createEmbed({
                title: `📖 ${prefix}${command.name} 명령어 정보`,
                fields: [
                    { name: '설명', value: command.description || '설명이 없습니다.', inline: false },
                    { name: '사용법', value: `\`${prefix}${command.name} ${command.usage || ''}\``, inline: false },
                    { name: '별칭', value: command.aliases ? command.aliases.map(a => `\`${a}\``).join(', ') : '없음', inline: true },
                    { name: '쿨다운', value: `${command.cooldown || client.config.bot.cooldown}초`, inline: true }
                ]
            });
            
            return isSlashCommand ?
                await interaction.reply({ embeds: [detailEmbed] }) :
                await interaction.reply({ embeds: [detailEmbed] });
        }
        
        const commandsPath = path.join(__dirname);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        const categories = {
            '🎉 기본': [],
            '🎮 엔터테인먼트': [],
            '🛠️ 유틸리티': [],
            '🎯 게임': []
        };
        
        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if (!command.name) continue;
            
            const commandInfo = `\`${prefix}${command.name}\` - ${command.description || '설명 없음'}`;
            
            switch(command.name) {
                case '안녕':
                case '운세':
                case '메뉴':
                case '도움말':
                    categories['🎉 기본'].push(commandInfo);
                    break;
                case '파이팅':
                case '명언':
                case '농담':
                    categories['🎮 엔터테인먼트'].push(commandInfo);
                    break;
                case '추천':
                case '팁':
                    categories['🛠️ 유틸리티'].push(commandInfo);
                    break;
                case '퀴즈':
                    categories['🎯 게임'].push(commandInfo);
                    break;
            }
        }
        
        const mainEmbed = createEmbed({
            title: '🍊 규리봇 명령어 도움말',
            description: `안녕하세요! 규리봇이에요!\n명령어 접두사는 \`${prefix}\` 입니다.\n\n**사용 예시:** \`${prefix}안녕\`, \`${prefix}운세\`\n\n아래 메뉴에서 카테고리를 선택하거나, \`${prefix}도움말 [명령어]\`로 상세 정보를 확인하세요!`,
            fields: Object.entries(categories)
                .filter(([_, commands]) => commands.length > 0)
                .map(([category, commands]) => ({
                    name: category,
                    value: commands.join('\n') || '준비 중이에요!',
                    inline: false
                })),
            footer: { text: '슬래시 명령어(/)도 지원해요!' }
        });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('카테고리를 선택하세요')
            .addOptions([
                {
                    label: '🎉 기본 명령어',
                    description: '인사, 운세, 메뉴 등',
                    value: 'basic'
                },
                {
                    label: '🎮 엔터테인먼트',
                    description: '파이팅, 명언, 농담',
                    value: 'entertainment'
                },
                {
                    label: '🛠️ 유틸리티',
                    description: '추천, 팁',
                    value: 'utility'
                },
                {
                    label: '🎯 게임',
                    description: '퀴즈',
                    value: 'game'
                },
                {
                    label: '📋 전체 명령어',
                    description: '모든 명령어 보기',
                    value: 'all'
                }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const response = isSlashCommand ?
            await interaction.reply({ embeds: [mainEmbed], components: [row] }) :
            await interaction.reply({ embeds: [mainEmbed], components: [row] });
        
        const message = isSlashCommand ? await interaction.fetchReply() : response;
        const collector = message.createMessageComponentCollector({ time: 60000 });
        
        collector.on('collect', async i => {
            if (i.user.id !== (isSlashCommand ? interaction.user.id : interaction.author.id)) {
                return i.reply({ content: '다른 사람의 도움말이에요!', ephemeral: true });
            }
            
            let categoryEmbed;
            
            switch(i.values[0]) {
                case 'basic':
                    categoryEmbed = createEmbed({
                        title: '🎉 기본 명령어',
                        description: categories['🎉 기본'].join('\n\n')
                    });
                    break;
                case 'entertainment':
                    categoryEmbed = createEmbed({
                        title: '🎮 엔터테인먼트 명령어',
                        description: categories['🎮 엔터테인먼트'].join('\n\n')
                    });
                    break;
                case 'utility':
                    categoryEmbed = createEmbed({
                        title: '🛠️ 유틸리티 명령어',
                        description: categories['🛠️ 유틸리티'].join('\n\n')
                    });
                    break;
                case 'game':
                    categoryEmbed = createEmbed({
                        title: '🎯 게임 명령어',
                        description: categories['🎯 게임'].join('\n\n')
                    });
                    break;
                case 'all':
                    categoryEmbed = mainEmbed;
                    break;
            }
            
            await i.update({ embeds: [categoryEmbed], components: [row] });
        });
        
        collector.on('end', () => {
            row.components[0].setDisabled(true);
        });
    }
};