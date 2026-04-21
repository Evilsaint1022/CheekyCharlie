const db = require("../../../Handlers/database");

module.exports = {
    name: "set-currency-icon",
    description: "Set the currency emoji for the server",

    async execute(message, args) {

            if (message.channel.isDMBased()) {
            return message.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const guildId = message.guild.id;
        const guildName = message.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = message.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return message.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: 64 });
        }

        try {
            // check if emoji was provided
            const emoji = args[0];

            if (!emoji) {
                return message.reply("❌ Please provide an emoji!\nExample: `?set-currency-icon 💰`");
            }

            // save to database
            await db.settings.set(`${message.guild.id}.currencyicon`, emoji);

            // confirmation
            message.reply(`✅ Currency icon set to ${emoji}`);
        } catch (err) {
            console.error(err);
            message.reply("❌ Something went wrong while saving the currency icon.");
        }
    }
};