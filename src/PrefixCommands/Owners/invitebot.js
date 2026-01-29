const db = require('../../Handlers/database');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'invitebot',
  description: 'Generate an invite link for the bot (Owner only)',
  async execute(message, args, client) {

    const userId = message.author.id;

    // 🔐 Owner check (ASYNC DB)
    const owners = await db.owners.get('CheekyCharlie_Owners');

    if (!Array.isArray(owners)) {
      console.error('Owners list broken:', owners);
      return message.reply('⚠️ Owner list is misconfigured.');
    }

    if (!owners.includes(userId)) {
      return message.reply('🚫 You do not have permission to use this command.');
    }

    // ⚙️ Permissions (change if you want)
    const permissions = new PermissionsBitField([
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.ManageMessages
    ]);

    const invite = `https://discord.com/oauth2/authorize` +
      `?client_id=${client.user.id}` +
      `&scope=bot%20applications.commands` +
      `&permissions=${permissions.bitfield}`;

    message.reply(
      `🔗 **Invite CheekyCharlie**\n` +
      `${invite}`
    );
  }
};
