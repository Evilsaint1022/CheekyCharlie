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
    const username = interaction.user.username;

    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: MessageFlags.Ephemeral
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

    try {
        // Fetch current settings safely
        const currentSettings = await db.settings.get(`${guildId}`) || {};

        // only update the boosters role
        currentSettings.boostersRoleId = role.id;

      // Save updated settings
      await db.settings.set(`${guildId}`, currentSettings);

     // Console Log
      console.log(`[⭐] [SET-BOOSTERS-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildKey} ${username} set the Boosters role to <@&${role.id}>`);

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
