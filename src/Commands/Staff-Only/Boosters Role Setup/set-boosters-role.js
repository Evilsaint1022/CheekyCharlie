const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-boosters-role')
    .setDescription('Set the server boosters role.')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Select the boosters role')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const guild = interaction.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const guildKey = `${guildName}_${guildId}`;
    const username = interaction.user.username;

    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
      const userRoles = interaction.member.roles.cache.map(role => role.id);
      const hasWhitelistedRole = whitelistedRoles.some(roleId => userRoles.includes(roleId));

      if (!hasWhitelistedRole) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    try {
        // Fetch current settings safely
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // only update the boosters role
        currentSettings.boostersRoleId = role.id;

      // Save updated settings
      await db.settings.set(`${guildName}_${guildId}`, currentSettings);

     // Console Log
      console.log(`[${new Date().toLocaleTimeString()}] ${guildKey} ${username} set the Boosters role to <@&${role.id}>`);

      await interaction.reply({
        content: `✅ Boosters role set to <@&${role.id}>`,
        flags: 64,
      });

    } catch (err) {
      console.error('❌ Failed to update boosters role:', err);
      await interaction.reply({
        content: '❌ An error occurred while setting the boosters role.',
        flags: 64,
      });
    }
  }
};
