const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database'); // Adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-color-of-the-week')
    .setDescription('Remove the Color of the Week role setting for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildKey = `${guild.id}`;
    const user = interaction.user;
    
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: MessageFlags.Ephemeral
      });
    }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    try {
      const currentSettings = await db.settings.get(guildKey);
      if (!currentSettings || !currentSettings.cotw) {
        return interaction.reply({
          content: `⚠️ No Color of the Week role is currently set for this server.`,
          flags: MessageFlags.Ephemeral
        });
      }

      delete currentSettings.cotw;
      await db.settings.set(guildKey, currentSettings);

      await interaction.reply({
        content: `✅ Color of the Week role has been removed.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error(`Failed to remove Color of the Week role for ${guild.name}:`, err.message);
      await interaction.reply({
        content: `❌ An error occurred while removing the role.`,
        flags: MessageFlags.Ephemeral
      });
    }
    console.log(`[⭐] [REMOVE-COLOR-OF-THE-WEEK] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guildId} ${user.username} used the remove-color-of-the-week command.`);
  }
};
