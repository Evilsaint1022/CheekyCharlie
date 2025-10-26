const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bank-channel")
    .setDescription("Set the bank channel for this server.")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("The channel to assign or mention during bumps.")
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

    try {
      const { guild, user, options } = interaction;
      const guildId = guild.id;
      const guildName = guild.name;
      const userId = user.id;
      
      //console logs
      console.log(`[💰] [SET-BANK-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the set-bank-channel command.`);

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

      const channel = options.getChannel("channel");
      const key = `${guildName}_${guildId}`;

      const existing = await db.settings.get(key) || {};
      existing.bankchannel = channel.id;

      await db.settings.set(key, existing);

      await interaction.reply({
        content: `✅ Bank channel set to <#${channel.id}>`,
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
