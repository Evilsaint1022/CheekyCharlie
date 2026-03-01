const { PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'set-whitelisted-roles',
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
        const role = message.mentions.roles.first();

        if (!role) {
            return message.reply('Please mention a role to whitelist.');
        }

        let WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        if (!WHITELISTED_ROLE_IDS.includes(role.id)) {
            WHITELISTED_ROLE_IDS.push(role.id);

            // Update the database with the new list of whitelisted roles
            db.whitelisted.set(`${guildId}.whitelistedRoles`, WHITELISTED_ROLE_IDS);
        }

        await message.reply(`The role <@&${role.id}> has been added to the whitelist.`);

        // Console Logs
        console.log(`[⭐] [SET-WHITELISTED-ROLES] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName}_${guildId} ${message.author.username} used the set-whitelisted-roles command. Added role <@&${role.id}> to the whitelist.`);
    }
};