const db = require('../../Handlers/database');
const { shutdownBot } = require('../../Utilities/StatusChannel/statusNotifier');

module.exports = {
    name: "shutdown",
    description: "Safely shuts down the bot",

    async execute(message, args) {

        // Prevent DMs
        if (message.channel.isDMBased()) {
            return message.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const userId = message.author.id;

        // ✅ AWAIT the DB read
        const owners = await db.owners.get('CheekyCharlie_Owners');

        // Hard safety check
        if (!Array.isArray(owners)) {
        console.error('Owners is not an array:', owners);
        return message.reply('⚠️ Owner list is broken. Check the database.');
        }

        // Owner-only check
        if (!owners.includes(userId)) {
        return message.reply('🚫 You do not have permission to view the server list!');
        }

        try {
            await message.reply("Shutting down...");
            await shutdownBot(message.client, {
                exitCode: 0,
                reason: `owner command by ${message.author.tag}`
            });

        } catch (err) {
            console.error("Shutdown Error:", err);

            return message.reply({
                content: "There was an error shutting down the bot.",
                flags: 64
            });
        }
    }
};
