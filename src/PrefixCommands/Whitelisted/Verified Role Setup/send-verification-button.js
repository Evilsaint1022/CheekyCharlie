const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  name: 'send-verification-button',
  aliases: [],

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guildId = message.guild.id;
    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

    const memberRoles = message.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (!hasPermission) {
      return message.reply('You do not have the required whitelisted role to use this command.');
    }

    const settings = await db.settings.get(guildId) || {};
    const verifiedRoleId = settings.VerifiedRole;

    if (!verifiedRoleId) {
      return message.reply('Please set a verified role first with `?set-verified-role <role_id or role_mention>`.');
    }

    const verifiedRole = await message.guild.roles.fetch(verifiedRoleId).catch(() => null);

    if (!verifiedRole) {
      return message.reply('The configured verified role no longer exists. Please set a new one with `?set-verified-role <role_id or role_mention>`.');
    }

    const mode = args[0]?.toLowerCase();

    if (!mode || !['math', 'puzzle'].includes(mode)) {
      return message.reply('Please choose a verification mode: `?send-verification-button math` or `?send-verification-button puzzle`.');
    }

    const label = args.slice(1).join(' ').trim() || 'Verify ->';

    if (label.length > 80) {
      return message.reply('Button label cannot be longer than 80 characters.');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verification_start_${mode}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({
      components: [row]
    });

    return message.reply(`✅ Verification button sent in **${mode}** mode.`);
  }
};
