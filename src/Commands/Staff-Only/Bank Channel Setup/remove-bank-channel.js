const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-bank-channel")
    .setDescription("Removes the bank channel for this server."),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: MessageFlags.Ephemeral // Makes the reply ephemeral
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
      const { guild, user } = interaction;
      const guildId = guild.id;
      const guildName = guild.name;
      const userId = user.id;
      
      //console logs
      console.log(`[💰] [REMOVE-BANK-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the remove-bank-channel command.`);

      const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
      const member = guild.members.cache.get(userId);

      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
      ) {
        return interaction.reply({
          content: '❌ You do not have permission to set the bank channel!',
          flags: MessageFlags.Ephemeral
        });
      }
      
      // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Check if a Bank channel is set
        if (!currentSettings.bankchannel) {
            return interaction.reply({ content: 'No Bank channel is currently set.', flags: MessageFlags.Ephemeral });
        }

        delete currentSettings.bankchannel;

        db.settings.set(`${guildName}_${guildId}`, currentSettings);

      await interaction.reply({
        content: `✅ Bank channel has been removed.`,
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error("Error setting Bank channel:", error);
      await interaction.reply({
        content: "❌ Failed to set the Bank channel.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
