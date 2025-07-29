const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-ban-channel')
    .setDescription('Remove the configured ^banned channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildKey = `${guild.name}_${guild.id}`;

    if (interaction.channel.isDMBased()) {
          return interaction.reply({
            content: "This command cannot be used in DMs.",
            flags: MessageFlags.Ephemeral
          });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const whitelistedRoles = await db.whitelisted.get(`${guild.name}_${guild.id}.whitelistedRoles`) || [];
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
      const currentSettings = await db.settings.get(guildKey);

      if (!currentSettings || !currentSettings.ban_channel) {
        return await interaction.reply({
          content: `⚠️ No ban channel is currently set.`,
          flags: 64
        });
      }

      // Remove the ban_channel key only
      delete currentSettings.ban_channel;

      // Save updated settings
      await db.settings.set(guildKey, currentSettings);

      await interaction.reply({
        content: `✅ Ban channel has been removed.`,
        flags: 64
      });
    } catch (error) {
      console.error('[RemoveBanChannel] Error:', error);
      await interaction.reply({
        content: `❌ There was an error removing the ban channel.`,
        flags: 64
      });
    }
  }
};
