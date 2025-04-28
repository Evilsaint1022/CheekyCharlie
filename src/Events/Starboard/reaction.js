const { Events, MessageReaction, User, Client, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
        
        const dirPath = path.join(__dirname, `../../Utilities/Servers/${reaction.message.guild.name}_${reaction.message.guild.id}/Settings/`);
        const starboardSettingsPath = path.join(dirPath, 'starboardSettings.json');

        if (fs.existsSync(starboardSettingsPath)) {
            const data = fs.readFileSync(starboardSettingsPath, 'utf8');
            const settings = JSON.parse(data);
            
            if ( !settings.channelId || !settings.count || !settings.emoji ) {
                console.log('Starboard settings are not properly configured.');
                return;
            }

            if ( reaction.count == settings.count && reaction.emoji.name == settings.emoji ) {

                const starBoardChannel = reaction.message.guild.channels.cache.get(settings.channelId);

                if ( !starBoardChannel ) {
                    console.log('Starboard channel not found.');
                    return;
                }

                const starboardEmbed = new EmbedBuilder()
                .setColor("Blurple")
                .setAuthor({ name: reaction.message.author.username, iconURL: reaction.message.author.displayAvatarURL() })
                .setDescription(reaction.message.content + "\n\n" + reaction.message.url + "")

                if ( reaction.message.attachments.size > 0 ) {
                    starboardEmbed.setImage(reaction.message.attachments.first().url);
                }

                await starBoardChannel.send({ embeds: [starboardEmbed] })

            }

        } else {
            console.log('Starboard settings file does not exist.');
        }
    
    },

};
