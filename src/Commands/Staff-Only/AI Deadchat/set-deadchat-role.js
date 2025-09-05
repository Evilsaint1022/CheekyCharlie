const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-deadchat-role')
    .setDescription('Set the role to to mention in deadchat messages.')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to mention.')
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

    const member = interaction.member;
    const guild = interaction.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const targetRole = interaction.options.getRole('role');

    if (!guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
    }

    const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
    ) {
      return interaction.reply({
        content: 'You do not have permission to set the verified role!',
        flags: 64,
      });
    }

    const guildKey = `${guildName}_${guildId}`;

    try {
      // Fetch current settings or default to empty object
      const currentSettings = await db.settings.get(guildKey) || {};

      // Update only the VerifiedRole field
      currentSettings.deadchatRoleId = targetRole.id;

      // Save updated settings
      db.settings.set(guildKey, currentSettings);

      await interaction.reply({ content: `✅ Deadchat role has been set to **${targetRole.name}**.\n-# Make sure the deadchat channel and deadchat duration are set too and the AI deadchat is activated.`, flags: 64 });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to set the deadchat role.', flags: 64 });
    }
  }
};
