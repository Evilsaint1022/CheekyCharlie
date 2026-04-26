const db = require('../../../Handlers/database');

module.exports = {
  name: 'remove-verified-role',
  aliases: [],

  async execute(message) {
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

    const currentSettings = await db.settings.get(guildId) || {};

    if (!currentSettings.VerifiedRole) {
      return message.reply('No verified role is currently set for this server.');
    }

    delete currentSettings.VerifiedRole;
    await db.settings.set(guildId, currentSettings);

    console.log(`[⭐] [REMOVED-VERIFIED-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.tag} removed verified role`);

    return message.reply('✅ Verified role has been removed. Auto-kick and button verification are now disabled until a new verified role is set.');
  }
};
