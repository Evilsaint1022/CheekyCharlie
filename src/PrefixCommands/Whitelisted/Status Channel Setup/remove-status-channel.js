const db = require('../../../Handlers/database');

module.exports = {
  name: 'remove-status-channel',
  aliases: ['removestatuschannel'],

  async execute(message) {
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guildId = message.guild.id;
    const guildName = message.guild.name;
    const whitelistedRoleIds = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];
    const memberRoleIds = message.member.roles.cache.map((role) => role.id);
    const hasPermission = whitelistedRoleIds.some((roleId) => memberRoleIds.includes(roleId));

    if (!hasPermission) {
      return message.reply('You do not have the required whitelisted role to use this command.');
    }

    try {
      const existingSettings = await db.settings.get(guildId) || {};

      if (!existingSettings.statusChannel) {
        return message.reply('No status channel is currently set.');
      }

      delete existingSettings.statusChannel;
      await db.settings.set(guildId, existingSettings);

      console.log(
        `[📡] [REMOVE-STATUS-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
        `${guildName} ${guildId} ${message.author.tag} removed the status channel.`
      );

      await message.reply('✅ Status channel has been removed.');
    } catch (error) {
      console.error('Error removing status channel:', error);
      await message.reply('❌ Failed to remove the status channel.');
    }
  }
};
