const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-verified-role')
    .setDescription('Remove the currently set verified role.'),

  async execute(interaction) {
    const member = interaction.member;
    const guild = interaction.guild;
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;

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
      db.settings.delete(guildKey);
      await interaction.reply({ content: '✅ Verified role setting has been removed.', flags: 64 });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to remove the verified role setting.', flags: 64 });
    }
  }
};
