const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle-qotd')
    .setDescription('Enable or disable the Question of the Day feature.')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable (true) or disable (false) QOTD')
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

    const guild = interaction.guild;
    const guildKey = `${guild.name}_${guild.id}`;

    let settings = await db.settings.get(guildKey) || {};

    // Flip the current state: if undefined or false → true, if true → false
    settings.qotdState = !settings.qotdState;

    await db.settings.set(guildKey, settings);

    return interaction.reply({
      content: settings.qotdState
        ? '✅ Question of the Day is now set to **true**.'
        : '❌ Question of the Day is now set to **false**.',
      flags: MessageFlags.Ephemeral
    });
  }
};
