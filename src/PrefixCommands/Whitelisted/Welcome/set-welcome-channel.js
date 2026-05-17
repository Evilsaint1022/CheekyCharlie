const {
  PermissionsBitField,
  ChannelType,
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
  name: 'set-welcome-channel',
  aliases: ['welcomechannel', 'setwelcomechannel'],
  description: 'Sets the welcome channel.',

  async execute(message, args) {

    // Ignore DMs
    if (!message.guild) return;

    const guildId = message.guild.id;
    const whitelistedRoleIds = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];
    const memberRoleIds = message.member.roles.cache.map((role) => role.id);
    const hasWhitelistedRole = whitelistedRoleIds.some((roleId) => memberRoleIds.includes(roleId));

    if (!hasWhitelistedRole) {
      return message.reply('You do not have the required whitelisted role to use this command.');
    }

    // Get mentioned channel
    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]);

    // Check if channel exists
    if (!channel) {
      return message.reply(
        '❌ Please mention a valid channel.\nExample: `!setwelcome #welcome`'
      );
    }

    // Make sure it is a text channel
    if (channel.type !== ChannelType.GuildText) {
      return message.reply(
        '❌ The welcome channel must be a text channel.'
      );
    }

    // Save channel ID
    await db.settings.set(
      `${message.guild.id}.welcomechannel`,
      channel.id
    );

    // Success message
    return message.reply(
      `✅ Welcome channel has been set to ${channel}`
    );
  },
};