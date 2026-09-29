const db = require('../../Handlers/database');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'invitebot',
  aliases: ["botinvite"],
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

    console.log(`[👑] [INVITE-BOT] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} used the invitebot command.`)

    const invite = `https://discord.com/oauth2/authorize` +
      `?client_id=${client.user.id}` +
      `&scope=bot%20applications.commands` +
      `&permissions=${permissions.bitfield}`;

    message.reply(
      `***🌿 \`CheekyCharlie Invite\` 🌿***\n` +
      `🔗 [\`Here is you're invite link:\`](${invite})`
    );
  }
};
