const { EmbedBuilder } = require('discord.js');
const config = require('../../config/config.json');

const createEmbed = (options = {}) => {
    const embed = new EmbedBuilder()
        .setColor(options.color || config.bot.color)
        .setTimestamp();
    
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.author) embed.setAuthor(options.author);
    if (options.footer) embed.setFooter(options.footer);
    if (options.fields) embed.addFields(options.fields);
    
    return embed;
};

const createSuccessEmbed = (title, description) => {
    return createEmbed({
        title: `${config.emojis.success} ${title}`,
        description: description
    });
};

const createErrorEmbed = (title, description) => {
    return createEmbed({
        title: `${config.emojis.error} ${title}`,
        description: description,
        color: '#FF0000'
    });
};

const createInfoEmbed = (title, description) => {
    return createEmbed({
        title: `ℹ️ ${title}`,
        description: description,
        color: '#0099FF'
    });
};

const formatList = (items, options = {}) => {
    const { numbered = false, emoji = '•' } = options;
    
    return items.map((item, index) => {
        if (numbered) {
            return `${index + 1}. ${item}`;
        }
        return `${emoji} ${item}`;
    }).join('\n');
};

const truncateText = (text, maxLength = 2000) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
};

const addEmoji = (text, emoji) => {
    return `${emoji} ${text}`;
};

const createProgressBar = (current, total, length = 10) => {
    const progress = Math.round((current / total) * length);
    const filled = '█'.repeat(progress);
    const empty = '░'.repeat(length - progress);
    return `[${filled}${empty}] ${current}/${total}`;
};

module.exports = {
    createEmbed,
    createSuccessEmbed,
    createErrorEmbed,
    createInfoEmbed,
    formatList,
    truncateText,
    addEmoji,
    createProgressBar
};