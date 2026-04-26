const db = require('../../../Handlers/database');

function getRoleId(input) {
  return input?.match(/^<@&(\d+)>$/)?.[1] || input?.match(/^\d+$/)?.[0];
}

module.exports = {
  name: 'set-verified-role',
  aliases: [],

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guildId = message.guild.id;
    const guildName = message.guild.name;
    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

    const memberRoles = message.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (!hasPermission) {
      return message.reply('You do not have the required whitelisted role to use this command.');
    }

    const roleId = getRoleId(args[0]);

    if (!roleId) {
      return message.reply('Please provide a role ID or role mention.');
    }

    const role = await message.guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
      return message.reply('I could not find that role in this server.');
    }

    const currentSettings = await db.settings.get(guildId) || {};
    currentSettings.VerifiedRole = role.id;

    await db.settings.set(guildId, currentSettings);

    console.log(`[⭐] [SET-VERIFIED-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.tag} Set the Verified Role to ${role.name}`);

    return message.reply(`✅ Verified role has been set to **${role.name}**.`);
  }
};
