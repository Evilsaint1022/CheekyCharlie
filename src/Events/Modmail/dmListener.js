const { Events, Message, Client } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {

    name: Events.MessageCreate,

    /**
     * @param {Message} message
     * @param {Client} client
     */

    async execute(message, client) {

        if ( !message.channel.isDMBased() ) { return; } // Return if the message is not in a DM channel
        
        if ( message.author.bot ) return; // Ignore messages from bots

        const modMailCannelId = await db.settings.get(`modmailChannelId`)

        if ( !modMailCannelId ) return;

        const modMailChannel = client.channels.cache.get(modMailCannelId);

        if ( !modMailChannel ) return;

        await modMailChannel.send({
            content: `**${message.author.tag}**:\n${message.content}`,
            files: message.attachments.size > 0 ? Array.from(message.attachments.values()).map(attachment => attachment.url) : []
        }).catch(error => {
            console.error(`Failed to send message to modmail channel:`, error);
        });

    }

}