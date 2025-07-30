const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const db = require("../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-starboard-emoji')
    .setDescription('Set the emoji used for starboard reactions')
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('The emoji to use for starboard reactions')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Prevent command usage in DMs
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const user = interaction.user;
    const userId = user.id;
    const guild = interaction.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const guildKey = `${guildName}_${guildId}`;

    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildKey}.whitelistedRoles`) || [];
    const member = guild.members.cache.get(userId);
    const memberRoles = interaction.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !hasPermission
    ) {
      return interaction.reply({
        content: '❌ You do not have permission to set the starboard emoji!',
        flags: 64
      });
    }

    const emojiInput = interaction.options.getString('emoji');

    // Load current config and only update the emoji
    const existingData = await db.starboard.get(guildKey) || {};
    existingData.starboardEmoji = emojiInput;

    await db.starboard.set(guildKey, existingData);

    return interaction.reply({
      content: `✅ Starboard emoji has been set to ${emojiInput}`,
      flags: 64
    });
  },
};
