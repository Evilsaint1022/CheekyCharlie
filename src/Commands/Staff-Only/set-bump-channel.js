const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bump-channel")
    .setDescription("Set the bump channel for this server.")
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

      const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
      const member = guild.members.cache.get(userId);

      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
      ) {
        return interaction.reply({
          content: '❌ You do not have permission to set the bump channel!',
          flags: 64
        });
      }

      const channel = options.getChannel("channel");
      const key = `${guildName}_${guildId}`;

      const existing = await db.bump.get(key) || {};
      existing.channelId = channel.id;

      await db.bump.set(key, existing);

      await interaction.reply({
        content: `✅ Bump channel set to <#${channel.id}>`,
        flags: 64
      });

    } catch (error) {
      console.error("Error setting bump channel:", error);
      await interaction.reply({
        content: "❌ Failed to set the bump channel.",
        flags: 64
      });
    }
  }
};
