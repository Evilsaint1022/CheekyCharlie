const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-boosters-role')
    .setDescription('Remove the server boosters role setting.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
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
      const currentSettings = await db.settings.get(guildKey) || {};

      if (!currentSettings.boostersRoleId) {
        return interaction.reply({
          content: 'ℹ️ No boosters role is currently set.',
          flags: 64,
        });
      }

      delete currentSettings.boostersRoleId;

      await db.settings.set(guildKey, currentSettings);

      console.log(`[⭐] [REMOVE-BOOSTERS-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${guildKey} ${username} removed the Boosters role setting.`);

      await interaction.reply({
        content: `✅ Boosters role setting has been removed.`,
        flags: 64,
      });

    } catch (err) {
      console.error('❌ Failed to remove boosters role:', err);
      await interaction.reply({
        content: '❌ An error occurred while removing the boosters role.',
        flags: 64,
      });
    }
  }
};
