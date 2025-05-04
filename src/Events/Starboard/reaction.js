const { Events, MessageReaction, User, Client, EmbedBuilder, Embed } = require('discord.js');
const fs = require('fs');
const path = require('path');

const db = require('../../Handlers/database');

module.exports = {

    name: Events.MessageReactionAdd,
    once: false,

    /**
     * @param {MessageReaction} reaction
     * @param {User}
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

        const authorName = reaction.message.author.bot 
            ? `${reaction.message.author.username} [🤖]` 
            : reaction.message.author.username;

        const starEmbed = new EmbedBuilder()
            .setAuthor({
                name: authorName,
                iconURL: reaction.message.author.displayAvatarURL(),
            })
            .setDescription(reaction.message.content || "No content")
            .setImage(reaction.message.attachments.first() ? reaction.message.attachments.first().url : null)
            .setColor("Blurple");

        reaction.message.attachments.forEach((attachment) => {
            starEmbed.addFields({ name: "Attachment", value: attachment.url });
        });

        if (reaction.emoji.name == emojiData) {

            await channel.send({ content: "**" + reaction.count + "** | " + reaction.message.url, embeds: [starEmbed] });

        } else if (customEmoji == emojiData) {

            await channel.send({ content: "**" + reaction.count + "** | " + reaction.message.url, embeds: [starEmbed] });

        } else { return; }

    },

};
