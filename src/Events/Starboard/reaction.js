const { Events, MessageReaction, User, Client } = require('discord.js');
const fs = require('fs');
const path = require('path');

const db = require('../../Handlers/database');

module.exports = {

    name: Events.MessageReactionAdd,
    once: false,

    /**
     * @param {MessageReaction} reaction
     * @param {User} user
     * @param {Client} client
     */
    async execute(reaction, user, client) {

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }

        const guildId = reaction.message.guild.id;
        const guildName = reaction.message.guild.name;

        const channelId = await db.starboard.get(`${guildName}_${guildId}_starboardChannel`)
        const emojiData = await db.starboard.get(`${guildName}_${guildId}_starboardEmoji`)
        const count = await db.starboard.get(`${guildName}_${guildId}_starboardCount`)

        let customEmoji = "<:" + reaction.emoji.name + ":" + reaction.emoji.id + ">";

        if (reaction.count !== count) { return; }

        if (reaction.message.channel.id == channelId) { return; }

        const channel = reaction.message.guild.channels.cache.get(channelId);
        const message = reaction.message;

        const authorName = message.author.bot
            ? `${message.author.username} [🤖]`
            : message.author.username;

        let content = `${customEmoji} | **${reaction.count}** | ${message.url}\n`;
        content += `**Author:** ${authorName}\n`;
        content += `**Content:** ${message.content || "_No Message Content_"}\n`;

        if (message.attachments.size > 0) {
            content += `**Attachments:**\n`;
            message.attachments.forEach((attachment) => {
                content += `${attachment.url}\n`;
            });
        }

        if (reaction.emoji.name == emojiData || customEmoji == emojiData) {
            const sentMessage = await channel.send({ content });
            try {
                // Add the custom emoji reaction to the sent message
                const emojiIdMatch = emojiData.match(/<a?:\w+:(\d+)>/);
                if (emojiIdMatch) {
                    await sentMessage.react(emojiIdMatch[1]);
                }
            } catch (err) {
                console.error('Failed to react with custom emoji:', err);
            }
        } else {
            return;
        }
    },
};
