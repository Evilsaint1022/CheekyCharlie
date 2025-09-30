const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-level-role')
    .setDescription('Assigns a role to a specific level (one role per level).')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('The level to assign the role to')
        .setRequired(true)
        .setMinValue(1)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign at that level')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('sticky')
        .setDescription('Whether to keep this role permanently')
        .setRequired(false)
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
    const role = interaction.options.getRole('role');
    const sticky = interaction.options.getBoolean('sticky') || false;

    const guild = interaction.guild;
    const member = interaction.member;
    const guildKey = `${guild.name}_${guild.id}`;

    try {
      const whitelistedRoles = await db.whitelisted.get(`${guildKey}.whitelistedRoles`) || [];
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const hasWhitelistedRole = member.roles.cache.some(r => whitelistedRoles.includes(r.id));
      if (!isAdmin && !hasWhitelistedRole) {
        return interaction.reply({
          content: '❌ You do not have permission to set the level role!',
          flags: 64,
        });
      }

      let roleMap = await db.levelroles.get(guildKey) || {};

      const existing = roleMap[level];
      const newRoleObject = { roleId: role.id, sticky };

      if (existing && (
        (typeof existing === 'string' && existing === role.id) ||
        (typeof existing === 'object' && existing.roleId === role.id && existing.sticky === sticky)
      )) {
        return interaction.reply({
          content: `⚠️ Role **${role.name}** is already assigned to level ${level} with sticky: \`${sticky}\`.`,
          flags: 64,
        });
      }

      roleMap[level] = newRoleObject;
      await db.levelroles.set(guildKey, roleMap);
      console.log(`[SET-LEVEL-ROLE] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${interaction.user.tag} Set level ${level} role to ${role.id}`);

      const msg = existing
        ? `✅ Updated level ${level} role to **${role.name}** (sticky: \`${sticky}\`).`
        : `✅ Assigned role **${role.name}** to level ${level} (sticky: \`${sticky}\`).`;

      return interaction.reply({
        content: msg,
        flags: 64,
      });

    } catch (error) {
      console.error('Error in /set-level-role:', error);
      return interaction.reply({
        content: '❌ An unexpected error occurred while saving the role.',
        flags: 64,
      });
    }
  }
};
