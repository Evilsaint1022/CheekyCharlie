const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
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
        flags: 64 // Makes the reply ephemeral
    });
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
          flags: 64
        });
      }
      
      // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Check if a Bank channel is set
        if (!currentSettings.bankchannel) {
            return interaction.reply({ content: 'No Bank channel is currently set.', flags: 64 });
        }

        delete currentSettings.bankchannel;

        db.settings.set(`${guildName}_${guildId}`, currentSettings);

      await interaction.reply({
        content: `✅ Bank channel has been removed.`,
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
