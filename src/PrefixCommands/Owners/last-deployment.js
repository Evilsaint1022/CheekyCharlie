const db = require('../../Handlers/database');

module.exports = {
    name: "last-deployment",
    aliases: ["deploy", "uptime"],

    async execute(message, args, client) {

        if (message.channel.isDMBased()) {
            return message.reply("This command cannot be used in DMs.");
        }

        const userId = message.author.id;
        const owners = await db.owners.get('CheekyCharlie_Owners');

        if (!Array.isArray(owners)) {
            console.error('Owners is not an array:', owners);
            return message.reply('⚠️ Owner list is broken. Check the database.');
        }

        if (!owners.includes(userId)) {
            return message.reply('🚫 You do not have permission to use this command.');
        }

        const ts = client.startupTime;

        return message.reply(
            `🌿 **Last Deployment**\n<t:${ts}:F> (<t:${ts}:R>)`
        );
    }
};
