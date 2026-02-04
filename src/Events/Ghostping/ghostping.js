const { Events, userMention } = require('discord.js');

module.exports = {
    name: Events.MessageDelete,

    /**
     * @param {import('discord.js').Message} message
     */
    async execute(message) {

        const guildName = message.guild.name
        const guildId = message.guild.id

        // Ignore messages from bots or DMs
        if (message.author?.bot || !message.guild) return;

        // If the message mentioned at least one user, it's a ghost ping
        if (message.mentions.users.size > 0) {
            
            try {
                // Get mentioned users
                const pingedUsers = message.mentions.users.map(u => `<@${u.id}>`).join(', ');

                const username = message.mentions.users.map(u => `${u.username}`).join(`, `);

                //console logs
                console.log(`[👻] [GHOST PING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} Ghost ping detected in ${message.channel.name} ${message.channel.id} - ${message.author.username} pinged ${username}` )

                // Send a notification in the channel
                message.channel.send({
                    content: `👻 **Ghost Ping Alert!** ${message.author} pinged ${pingedUsers} and deleted the message.`
                });
            } catch (err) {
                console.error('Error detecting ghost ping:', err);
            }
        }
    }
};
