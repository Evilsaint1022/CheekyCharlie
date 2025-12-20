const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

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

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    const level = interaction.options.getInteger('level');
    const guild = interaction.guild;
    const guildKey = `${guild.id}`;

    try {
      let roleMap = await db.levelroles.get(guildKey) || {};

      // Check if role exists at the given level
      const removedRoleId = roleMap[level];
      if (!removedRoleId) {
        return interaction.reply({
          content: `⚠️ No role is assigned to level ${level}.`,
          flags: 64,
        });
      }

      // Delete and update
      delete roleMap[level];
      await db.levelroles.set(guildKey, roleMap);
      console.log(`[⭐] [REMOVE-LEVEL-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${interaction.user.tag} removed role <@&${removedRoleId}> from level ${level}.`);

      return interaction.reply({
        content: `✅ Removed role <@&${removedRoleId}> from level ${level}.`,
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
