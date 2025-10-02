const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bump-role")
    .setDescription("Set the bump role for this server.")
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("The role to assign or mention during bumps.")
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
          content: '❌ You do not have permission to set the bump role!',
          flags: 64
        });
      }

      const role = options.getRole("role");
      const key = `${guildName}_${guildId}`;

      const existing = await db.bump.get(key) || {};
      existing.roleId = role.id;

      await db.bump.set(key, existing);
      console.log(`[⭐] [SET-BUMP-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ")}] ${guildName} ${guildId} ${interaction.user.username} used the set-bump-role command.`);

      await interaction.reply({
        content: `✅ Bump role set to <@&${role.id}>`,
        flags: 64
      });

    } catch (error) {
      console.error("Error setting bump role:", error);
      await interaction.reply({
        content: "❌ Failed to set the bump role.",
        flags: 64
      });
    }
  }
};
