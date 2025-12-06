const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-qotd-channel')
    .setDescription('Set the channel where the Question of the Day will be sent.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Select the QOTD channel')
        .addChannelTypes(ChannelType.GuildText)
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

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    const channel = interaction.options.getChannel('channel');
    const guild = interaction.guild;
    const guildKey = `${guild.name}_${guild.id}`;

    let settings = await db.settings.get(guildKey) || {};
    settings.qotdChannelId = channel.id;

    await db.settings.set(guildKey, settings);

    return interaction.reply({
      content: `✅ QOTD channel set to ${channel}`,
      flags: 64
    });
  }
};
