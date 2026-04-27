const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-verified-role')
    .setDescription('Set the role to assign to verified members.')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign to verified members.')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role_to_remove')
        .setDescription('Optional role to remove after a member verifies.')
        .setRequired(false)
    ),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
  }
    const targetRole = interaction.options.getRole('role');
    const roleToRemove = interaction.options.getRole('role_to_remove');

    if (roleToRemove && roleToRemove.id === targetRole.id) {
      return interaction.reply({ content: 'The verified role and the role to remove cannot be the same role.', flags: 64 });
    }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    const guildKey = `${guildId}`;

    try {
      // Fetch current settings or default to empty object
      const currentSettings = await db.settings.get(guildKey) || {};

      // Update only the VerifiedRole field
      currentSettings.VerifiedRole = targetRole.id;
      if (roleToRemove) {
        currentSettings.UnverifiedRole = roleToRemove.id;
      } else {
        delete currentSettings.UnverifiedRole;
      }

      // Save updated settings
      await db.settings.set(guildKey, currentSettings);
      console.log(`[⭐] [SET-VERIFIED-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} Set the Verified Role to ${targetRole.name}${roleToRemove ? ` and Unverified Role to ${roleToRemove.name}` : ''}`);

      await interaction.reply({ content: `✅ Verified role has been set to **${targetRole.name}**.${roleToRemove ? ` Members will also have **${roleToRemove.name}** removed after verification.` : ''}`, flags: 64 });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to set the verified role.', flags: 64 });
    }
  }
};
