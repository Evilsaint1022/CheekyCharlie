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
    const roleToRemoveId = getRoleId(args[1]);

    if (!roleId) {
      return message.reply('Please provide a role ID or role mention. Optional: add a second role to remove after verification.');
    }

    if (roleToRemoveId && roleToRemoveId === roleId) {
      return message.reply('The verified role and the role to remove cannot be the same role.');
    }

    const role = await message.guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
      return message.reply('I could not find that role in this server.');
    }

    let roleToRemove = null;

    if (roleToRemoveId) {
      roleToRemove = await message.guild.roles.fetch(roleToRemoveId).catch(() => null);

      if (!roleToRemove) {
        return message.reply('I could not find the role to remove in this server.');
      }
    }

    const currentSettings = await db.settings.get(guildId) || {};
    currentSettings.VerifiedRole = role.id;

    if (roleToRemove) {
      currentSettings.UnverifiedRole = roleToRemove.id;
    } else {
      delete currentSettings.UnverifiedRole;
    }

    await db.settings.set(guildId, currentSettings);

    console.log(`[⭐] [SET-VERIFIED-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.tag} Set the Verified Role to ${role.name}${roleToRemove ? ` and Unverified Role to ${roleToRemove.name}` : ''}`);

    return message.reply(`✅ Verified role has been set to **${role.name}**.${roleToRemove ? ` Members will also have **${roleToRemove.name}** removed after verification.` : ''}`);
  }
};
