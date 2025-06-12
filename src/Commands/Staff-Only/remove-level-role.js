const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../Handlers/database'); // Adjust path as needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-level-role')
    .setDescription('Removes the role assigned to a specific level.')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('The level to remove the role from')
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64,
      });
    }

    const level = interaction.options.getInteger('level');
    const guild = interaction.guild;
    const member = interaction.member;
    const guildKey = `${guild.name}_${guild.id}`;

    try {
      // Permission check with whitelisted roles
      const whitelistedRoles = await db.whitelisted.get(`${guildKey}.whitelistedRoles`) || [];
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const hasWhitelistedRole = member.roles.cache.some(r => whitelistedRoles.includes(r.id));
      if (!isAdmin && !hasWhitelistedRole) {
        return interaction.reply({
          content: '❌ You do not have permission to remove the level role!',
          flags: 64,
        });
      }

      // Load existing roles map or empty object
      let roleMap = await db.levelroles.get(guildKey) || {};

      if (!roleMap[level]) {
        return interaction.reply({
          content: `⚠️ No role is assigned to level ${level}.`,
          flags: 64,
        });
      }

      // Remove the level from the map
      delete roleMap[level];

      await db.levelroles.set(guildKey, roleMap);

      return interaction.reply({
        content: `✅ Role assigned to level ${level} has been removed.`,
        flags: 64,
      });

    } catch (error) {
      console.error('Error in /remove-level-role:', error);
      return interaction.reply({
        content: '❌ An unexpected error occurred while removing the role.',
        flags: 64,
      });
    }
  },
};
