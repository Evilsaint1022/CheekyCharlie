const db = require('../../../Handlers/database');

module.exports = {
  name: "prefix-reset",
  aliases: ["pr"],

  async execute(message) {

    // Prevent command usage in DMs
    if (!message.guild) {
       return message.reply("This command cannot be used in DMs.");
    }

    const guildId = message.guild.id;
    const guildName = message.guild.name;

    const WHITELISTED_ROLE_IDS =
    await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

    const memberRoles = message.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId =>
        memberRoles.includes(roleId)
    );

    if (!hasPermission) {
    return message.reply('You do not have the required whitelisted role to use this command.');
    }

    // Get existing settings
    const existingSettings = await db.settings.get(guildId) || {};

    // Remove custom prefix by deleting it
    delete existingSettings.prefix;

    // Save updated settings
    await db.settings.set(guildId, existingSettings);

    message.reply("✅ Prefix has been reset to the default.");
  }
};