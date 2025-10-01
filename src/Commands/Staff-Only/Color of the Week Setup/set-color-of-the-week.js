const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-color-of-the-week')
    .setDescription('Set the role used for Color of the Week')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to update colors on')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.user;
    const role = interaction.options.getRole('role');
    const guild = interaction.guild;
    const guildKey = `${guild.name}_${guild.id}`;

    if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
            const userRoles = interaction.member.roles.cache.map(role => role.id);
            const hasWhitelistedRole = whitelistedRoles.some(roleId => userRoles.includes(roleId));

            if (!hasWhitelistedRole) {
                return interaction.reply({ 
                    content: 'You do not have permission to use this command.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

    try {
      const currentSettings = await db.settings.get(guildKey) || {};

      // Merge the new COTW setting without overwriting other keys
      const updatedSettings = {
        ...currentSettings,
        cotw: role.id
      };

      await db.settings.set(guildKey, updatedSettings);

      await interaction.reply({
        content: `✅ Color of the Week role set to **${role.name}**.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error(`Failed to set Color of the Week role for ${guild.name}:`, err.message);
      await interaction.reply({
        content: `❌ An error occurred while saving the role.`,
        flags: MessageFlags.Ephemeral
      });
    }
    console.log(`[⭐] [SET-COLOR-OF-THE-WEEK] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${user.username} used the set-color-of-the-week command.`);
  }
};
