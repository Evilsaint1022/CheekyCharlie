const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require("../../../Handlers/database");

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
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const guildKey = `${guildId}`;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
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
