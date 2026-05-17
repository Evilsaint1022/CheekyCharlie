const db = require('../../../Handlers/database');

module.exports = {
  name: 'remove-welcome-channel',
  aliases: ['removewelcomechannel', 'deletewelcomechannel'],
  description: 'Removes the set welcome channel.',

  async execute(message) {

    // Ignore DMs
    if (!message.guild) return;

    const guildId = message.guild.id;

    const whitelistedRoleIds =
      await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

    const memberRoleIds =
      message.member.roles.cache.map((role) => role.id);

    const hasWhitelistedRole =
      whitelistedRoleIds.some((roleId) =>
        memberRoleIds.includes(roleId)
      );

    if (!hasWhitelistedRole) {
      return message.reply(
        'You do not have the required whitelisted role to use this command.'
      );
    }

    // Check if a welcome channel is set
    const currentChannel =
      await db.settings.get(`${guildId}.welcomechannel`);

    if (!currentChannel) {
      return message.reply(
        '❌ No welcome channel is currently set.'
      );
    }

    // Remove the welcome channel
    await db.settings.delete(`${guildId}.welcomechannel`);

    // Success message
    return message.reply(
      '✅ Welcome channel has been removed.'
    );
  },
};