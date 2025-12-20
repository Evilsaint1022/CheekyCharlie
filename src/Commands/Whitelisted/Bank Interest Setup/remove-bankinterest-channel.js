const { SlashCommandBuilder, PermissionsBitField, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-bankinterest-channel")
    .setDescription("Removes the bank interest channel for this server."),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
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
      const { guild, user } = interaction;
      const guildId = guild.id;
      const guildName = guild.name;
      const userId = user.id;
      
      //console logs
      console.log(`[💰] [REMOVE-BANKINTEREST-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the remove-bank-channel command.`);

      const whitelistedRoles = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];
      const member = guild.members.cache.get(userId);

      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
      ) {
        return interaction.reply({
          content: '❌ You do not have permission to set the bank channel!',
          flags: 64
        });
      }
      
      // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildId}`) || {};

        // Check if a Bank channel is set
        if (!currentSettings.bankinterest) {
            return interaction.reply({ content: 'No Bank Interest channel is currently set.', flags: 64 });
        }

        delete currentSettings.bankinterest;

        db.settings.set(`$${guildId}`, currentSettings);

      await interaction.reply({
        content: `✅ Bank Interest channel has been removed.`,
        flags: 64
      });

    } catch (error) {
      console.error("Error setting Bank channel:", error);
      await interaction.reply({
        content: "❌ Failed to set the Bank channel.",
        flags: 64
      });
    }
  }
};
