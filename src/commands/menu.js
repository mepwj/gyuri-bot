const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const menuData = require('../data/menus.json');
const { getRandomItem } = require('../utils/randomSelector');
const { createEmbed } = require('../utils/responseFormatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('메뉴')
        .setDescription('메뉴를 추천해드려요!')
        .addStringOption(option =>
            option.setName('종류')
                .setDescription('메뉴 종류를 선택하세요')
                .setRequired(false)
                .addChoices(
                    { name: '점심', value: 'lunch' },
                    { name: '저녁', value: 'dinner' },
                    { name: '야식', value: 'snack' },
                    { name: '디저트', value: 'dessert' }
                )),
    
    name: '메뉴',
    aliases: ['점심', '저녁', '야식', '뭐먹지', 'menu'],
    description: '메뉴를 추천해드려요!',
    usage: '[점심/저녁/야식/디저트]',
    cooldown: 3,
    
    async execute(interaction) {
        const isSlashCommand = interaction.isChatInputCommand;
        const userId = isSlashCommand ? interaction.user.id : interaction.author.id;
        
        let menuType = 'lunch';
        
        if (isSlashCommand) {
            menuType = interaction.options.getString('종류') || 'lunch';
        } else {
            const commandName = interaction.content.split(' ')[0].slice(1);
            if (commandName === '점심') menuType = 'lunch';
            else if (commandName === '저녁') menuType = 'dinner';
            else if (commandName === '야식') menuType = 'snack';
            else {
                const args = interaction.content.split(' ').slice(1);
                if (args[0]) {
                    if (args[0].includes('점심')) menuType = 'lunch';
                    else if (args[0].includes('저녁')) menuType = 'dinner';
                    else if (args[0].includes('야식')) menuType = 'snack';
                    else if (args[0].includes('디저트')) menuType = 'dessert';
                }
            }
        }
        
        const menuList = menuData[menuType] || menuData.lunch;
        const recommendedMenu = getRandomItem(menuList);
        
        const embed = createEmbed({
            title: `${recommendedMenu.emoji} 오늘의 추천 메뉴`,
            description: `**${recommendedMenu.name}**\n${recommendedMenu.description}`,
            fields: [
                { name: '카테고리', value: recommendedMenu.category || menuType, inline: true },
                { name: '추천 이유', value: '규리가 엄선한 메뉴예요!', inline: true }
            ],
            footer: { text: '맛있게 드세요! 🍊' }
        });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_select')
            .setPlaceholder('다른 메뉴 카테고리 선택')
            .addOptions([
                {
                    label: '점심 메뉴',
                    description: '점심으로 좋은 메뉴들',
                    value: 'lunch',
                    emoji: '🍽️'
                },
                {
                    label: '저녁 메뉴',
                    description: '저녁으로 좋은 메뉴들',
                    value: 'dinner',
                    emoji: '🌆'
                },
                {
                    label: '야식 메뉴',
                    description: '밤에 먹기 좋은 메뉴들',
                    value: 'snack',
                    emoji: '🌙'
                },
                {
                    label: '디저트',
                    description: '달콤한 디저트',
                    value: 'dessert',
                    emoji: '🍰'
                }
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        if (isSlashCommand) {
            await interaction.reply({ embeds: [embed], components: [row] });
        } else {
            await interaction.reply({ embeds: [embed], components: [row] });
        }
        
        const filter = i => i.customId === 'menu_select' && i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
        
        collector.on('collect', async i => {
            const selectedType = i.values[0];
            const newMenuList = menuData[selectedType];
            const newMenu = getRandomItem(newMenuList);
            
            const newEmbed = createEmbed({
                title: `${newMenu.emoji} 추천 ${selectedType === 'lunch' ? '점심' : selectedType === 'dinner' ? '저녁' : selectedType === 'snack' ? '야식' : '디저트'} 메뉴`,
                description: `**${newMenu.name}**\n${newMenu.description}`,
                fields: [
                    { name: '카테고리', value: newMenu.category || selectedType, inline: true },
                    { name: '추천 이유', value: '규리가 엄선한 메뉴예요!', inline: true }
                ],
                footer: { text: '맛있게 드세요! 🍊' }
            });
            
            await i.update({ embeds: [newEmbed], components: [row] });
        });
        
        collector.on('end', () => {
            row.components[0].setDisabled(true);
        });
    }
};