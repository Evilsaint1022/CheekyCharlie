const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-qotd-role')
    .setDescription('Set the role to mention for Question of the Day.')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Select the QOTD role to mention')
        .setRequired(true)
    ),

  async execute(interaction) {
        
    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: MessageFlags.Ephemeral // Makes the reply ephemeral
    });
}

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

    const role = interaction.options.getRole('role');
    const guild = interaction.guild;
    const guildKey = `${guild.name}_${guild.id}`;

    let settings = await db.settings.get(guildKey) || {};
    settings.qotdRoleId = role.id;

    await db.settings.set(guildKey, settings);

    return interaction.reply({
      content: `✅ QOTD role set to ${role}`,
      flags: MessageFlags.Ephemeral
    });
  }
};
