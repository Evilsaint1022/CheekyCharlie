const db = require('../../../Handlers/database');
const {
  upsertStickyMessage,
  logSticky,
  logStickyError
} = require('../../../Utilities/StickyMessages/stickyManager');

module.exports = {
  name: 'sticky-message',
  aliases: [],

  async execute(message, args, client) {
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guildId = message.guild.id;
    const whitelistedRoleIds = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];
    const memberRoleIds = message.member.roles.cache.map((role) => role.id);
    const hasWhitelistedRole = whitelistedRoleIds.some((roleId) => memberRoleIds.includes(roleId));

    if (!hasWhitelistedRole) {
      return message.reply('You do not have the required whitelisted role to use this command.');
    }

    const stickyContent = message.rawArgs?.trim();

    if (!stickyContent) {
      return message.reply(
        'Use `?sticky-message` followed by the sticky content on the next line.'
      );
    }

    if (stickyContent.length > 4096) {
      return message.reply('Sticky messages must be 4096 characters or less so they fit in the embed.');
    }

    try {
      await message.delete().catch(() => {});

      const stickyMessage = await upsertStickyMessage({
        client,
        guild: message.guild,
        channel: message.channel,
        content: stickyContent,
        authorTag: message.author.tag,
        deleteExisting: true
      });

      logSticky(
        `${message.guild.name} ${message.guild.id} ${message.author.tag} set a sticky message in #${message.channel.name} (${message.channel.id}) as ${stickyMessage.id}.`
      );
    } catch (error) {
      logStickyError(
        `${message.guild.name} ${message.guild.id} failed to set a sticky message in channel ${message.channel.id}.`,
        error
      );

      await message.channel.send('❌ I could not create the sticky message in this channel.');
    }
  }
};
