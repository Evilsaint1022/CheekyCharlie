const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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
        flags: MessageFlags.Ephemeral,
      });
    }

    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('role');
    const sticky = interaction.options.getBoolean('sticky') || false;

    const guild = interaction.guild;
    const guildKey = `${guild.name}_${guild.id}`;

    try {
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

      let roleMap = await db.levelroles.get(guildKey) || {};

      const existing = roleMap[level];
      const newRoleObject = { roleId: role.id, sticky };

      if (existing && (
        (typeof existing === 'string' && existing === role.id) ||
        (typeof existing === 'object' && existing.roleId === role.id && existing.sticky === sticky)
      )) {
        return interaction.reply({
          content: `⚠️ Role **${role.name}** is already assigned to level ${level} with sticky: \`${sticky}\`.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      roleMap[level] = newRoleObject;
      await db.levelroles.set(guildKey, roleMap);
      console.log(`[⭐] [SET-LEVEL-ROLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.tag} Set level ${level} role to ${role.id}`);

      const msg = existing
        ? `✅ Updated level ${level} role to **${role.name}** (sticky: \`${sticky}\`).`
        : `✅ Assigned role **${role.name}** to level ${level} (sticky: \`${sticky}\`).`;

      return interaction.reply({
        content: msg,
        flags: MessageFlags.Ephemeral,
      });

    } catch (error) {
      console.error('Error in /set-level-role:', error);
      return interaction.reply({
        content: '❌ An unexpected error occurred while saving the role.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};
