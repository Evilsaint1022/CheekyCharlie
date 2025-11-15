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

    const guildKey = `${guildName}_${guildId}`;

    try {
      // Fetch current settings or default to empty object
      const currentSettings = await db.settings.get(guildKey) || {};

      // Update only the VerifiedRole field
      currentSettings.VerifiedRole = targetRole.id;

      // Save updated settings
      db.settings.set(guildKey, currentSettings);
      console.log(`[⭐] [SET-VERIFIED-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} Set the Verified Role to ${targetRole.name}`);

      await interaction.reply({ content: `✅ Verified role has been set to **${targetRole.name}**.`, flags: 64 });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to set the verified role.', flags: 64 });
    }
  }
};
