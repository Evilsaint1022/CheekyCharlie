const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle-levels')
    .setDescription('Toggle the levels feature on or off for this server.'),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: 'This command cannot be used in DMs.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;

    // Check admin permissions or whitelisted role
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
      const userRoles = interaction.member.roles.cache.map(role => role.id);
      const hasWhitelistedRole = whitelistedRoles.some(roleId => userRoles.includes(roleId));

      if (!hasWhitelistedRole) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // Get current levels state (default false)
    const currentState = await db.settings.get(`${guildName}_${guildId}.levels`) || false;

    if (currentState) {
      await db.settings.set(`${guildName}_${guildId}.levels`, false);
      await interaction.reply({
        content: 'Levels feature has been **disabled** for this server.',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await db.settings.set(`${guildName}_${guildId}.levels`, true);
      await interaction.reply({
        content: 'Levels feature has been **enabled** for this server.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
