// staffapplications.js
const db = require('../../../Handlers/database'); // adjust path if needed

module.exports = {
    name: "staff-toggle",
    description: "Toggle staff applications on or off.",

    async execute(message) {

        const guildId = message.guild.id;
        const guildName = message.guild.name;

        const WHITELISTED_ROLE_IDS =
            await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = message.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId =>
            memberRoles.includes(roleId)
        );

        if (!hasPermission) {
            return message.reply(
                'You do not have the required whitelisted role to use this command.'
            );
        }

        // Restrict to admins
        if (!message.member.permissions.has('Administrator')) {
            return message.reply("❌ You must be an administrator to use this command.");
        }

        // Get current boolean (true/false)
        const current = await db.settings.get(`${guildId}.staffapplications`);

        // Default to false if undefined, then toggle
        const newValue = !(current ?? false);

        // Save new value ONLY in settings DB
        await db.settings.set(`${guildId}.staffapplications`, newValue);

        // Console log
        console.log(
            `[⭐] [STAFF-TOGGLE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guildName} ${guildId} ${message.author.username} used the staff-toggle command to toggle staff applications to ${newValue}`
        );

        return message.reply(
            `📋 Staff Applications are now **${newValue ? "ENABLED" : "DISABLED"}** for this server.`
        );
    }
};
