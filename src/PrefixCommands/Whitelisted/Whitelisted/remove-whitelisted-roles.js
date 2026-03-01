const { PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'remove-whitelisted-roles',
    aliases: [],

    async execute(message, args) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply("This command cannot be used in DMs.");
        }

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        const guildId = message.guild.id;
        const guildName = message.guild.name;
        let WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = message.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return message.reply('You do not have the required whitelisted role to use this command.');
        }

        const role = message.mentions.roles.first();

        if (!role) {
            return message.reply('Please mention a role to remove from the whitelist.');
        }

        if (!WHITELISTED_ROLE_IDS.includes(role.id)) {
            return message.reply(`The role <@&${role.id}> is not in the whitelist.`);
        }

        // Remove the role from the array
        WHITELISTED_ROLE_IDS = WHITELISTED_ROLE_IDS.filter(id => id !== role.id);

        // Update the database with the new list of whitelisted roles
        db.whitelisted.set(`${guildId}.whitelistedRoles`, WHITELISTED_ROLE_IDS);

        await message.reply(`The role <@&${role.id}> has been removed from the whitelist.`);

        // Console Logs
        console.log(`[⭐] [REMOVE-WHITELISTED-ROLES] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName}_${guildId} ${message.author.username} used the remove-whitelisted-roles command. Removed role <@&${role.id}> from the whitelist.`);
    }
};