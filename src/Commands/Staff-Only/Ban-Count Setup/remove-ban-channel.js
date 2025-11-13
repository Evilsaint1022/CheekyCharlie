const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-ban-channel')
    .setDescription('Remove the configured ^banned channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildKey = `${guild.name}_${guild.id}`;
    const username = interaction.user.username;

    if (interaction.channel.isDMBased()) {
          return interaction.reply({
            content: "This command cannot be used in DMs.",
            flags: MessageFlags.Ephemeral
          });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    try {
      const currentSettings = await db.settings.get(guildKey);

      if (!currentSettings || !currentSettings.ban_channel) {
        return await interaction.reply({
          content: `⚠️ No ban channel is currently set.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Remove the ban_channel key only
      delete currentSettings.ban_channel;

      // Save updated settings
      await db.settings.set(guildKey, currentSettings);
      console.log(`[⭐] [REMOVE-BAN-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${username} removed ${currentSettings.ban_channel} from the ban channel.`);

      await interaction.reply({
        content: `✅ Ban channel has been removed.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('[RemoveBanChannel] Error:', error);
      await interaction.reply({
        content: `❌ There was an error removing the ban channel.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
