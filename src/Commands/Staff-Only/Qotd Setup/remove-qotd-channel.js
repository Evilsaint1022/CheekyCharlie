const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-qotd-channel')
    .setDescription('Removes the channel where the Question of the Day will be sent.'),

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

    const guildKey = `${guild.name}_${guild.id}`;

    const settings = await db.settings.get(guildKey) || {};

    // Check if a qotd channel is set
        if (!settings.qotdChannelId) {
            return interaction.reply({ content: 'No Qotd channel is currently set.', flags: MessageFlags.Ephemeral });

        } else {

    delete settings.qotdChannelId

    await db.settings.set(guildKey, settings);
    console.log(`[⭐] [REMOVE-QOTD-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} used the remove-qotd-channel command.`);

    return interaction.reply({
      content: `✅ QOTD channel has been removed`,
      flags: MessageFlags.Ephemeral
    });
  }
 }
};