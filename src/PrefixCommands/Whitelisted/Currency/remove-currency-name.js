const db = require("../../../Handlers/database");

module.exports = {
    name: "remove-currency-name",
    description: "Remove the currency name for the server",

    async execute(message, args) {

        if (message.channel.isDMBased()) {
            return message.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const guildId = message.guild.id;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = message.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return message.reply({
                content: 'You do not have the required whitelisted role to use this command.',
                flags: 64
            });
        }

        try {
            // check if it exists
            const existing = await db.settings.get(`${guildId}.currencyname`);

            if (!existing) {
                return message.reply("❌ No currency name is currently set.");
            }

            // delete from database
            await db.settings.delete(`${guildId}.currencyname`);

            message.reply("✅ Currency name has been removed.");
        } catch (err) {
            console.error(err);
            message.reply("❌ Something went wrong while removing the currency name.");
        }
    }
};