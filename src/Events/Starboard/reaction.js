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

        const channelId = await db.config.get(`${guildId}_starboardChannel`)
        const emojiData = await db.config.get(`${guildId}_starboardEmoji`)
        const count = await db.config.get(`${guildId}_starboardCount`)

        // if ( !channelId || !emoji || !count ) {console.log("Starboard not configured"); return;};

        let customEmoji = "<:" + reaction.emoji.name + ":" + reaction.emoji.id + ">";

        if ( reaction.count !== count ) { return; }

        if ( reaction.message.channel.id == channelId ) { return; }

        const channel = reaction.message.guild.channels.cache.get(channelId);

        const message = reaction.message;

        const starEmbed = new EmbedBuilder()
        .setColor("Blurple")
        .setDescription(message.content + "\n\n" + message.url)
        .setFooter({ text: `Message reached **${reaction.count}** reactions!` })
        .setAuthor({ name: message.author.displayName, iconURL: message.author.displayAvatarURL() })
        
        if ( reaction.emoji.name == emojiData ) {

            await channel.send({ embeds: [starEmbed] });

        } else if ( customEmoji == emojiData ) {

            await channel.send({ embeds: [starEmbed] });

        } else { return; }

    },

};
