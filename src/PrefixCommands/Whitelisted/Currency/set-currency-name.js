const db = require("../../../Handlers/database");

module.exports = {
    name: "set-currency-name",
    description: "Set the currency name for the server",

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
            // get full name (supports spaces)
            const currencyName = args.join(" ");

            if (!currencyName) {
                return message.reply("❌ Please provide a currency name!\nExample: `?set-currency-name Coins`");
            }

            // save to database
            await db.settings.set(`${guildId}.currencyname`, currencyName);

            message.reply(`✅ Currency name set to **${currencyName}**`);
        } catch (err) {
            console.error(err);
            message.reply("❌ Something went wrong while saving the currency name.");
        }
    }
};