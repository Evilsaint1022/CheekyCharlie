const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-verified-role')
    .setDescription('Set the role to assign to verified members.')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign to verified members.')
        .setRequired(true)
    ),

  async execute(interaction) {
    const member = interaction.member;
    const guild = interaction.guild;
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const targetRole = interaction.options.getRole('role');

    if (!guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
    }

    const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
    if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
        !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
    ) {
        return interaction.reply({
            content: 'You do not have permission to set the party drops channel!',
            flags: 64,
        });
    }

    const guildKey = `${guild.name}_${guild.id}_verifiedRoleId`;

    try {
      db.settings.set(guildKey, targetRole.id);
      await interaction.reply({ content: `✅ Verified role has been set to **${targetRole.name}**.`, flags: 64 });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to set the verified role.', flags: 64 });
    }
  }
};
