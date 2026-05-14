const db = require('../../../Handlers/database');

module.exports = {
  name: 'set-status-channel',
  aliases: ['setstatuschannel'],

  async execute(message, args) {
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

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

    if (!channel || !channel.isTextBased()) {
      return message.reply('❌ Please provide a valid channel.');
    }

    try {
      const existingSettings = await db.settings.get(guildId) || {};

      await db.settings.set(guildId, {
        ...existingSettings,
        statusChannel: channel.id
      });

      console.log(
        `[📡] [SET-STATUS-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
        `${guildName} ${guildId} ${message.author.tag} set the status channel to ${channel.name} ${channel.id}.`
      );

      await message.reply(`✅ Status channel has been set to <#${channel.id}>`);
    } catch (error) {
      console.error('Error setting status channel:', error);
      await message.reply('❌ Failed to set the status channel.');
    }
  }
};
