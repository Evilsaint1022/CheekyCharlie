const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-counting-channel')
    .setDescription('Remove the currently set counting channel.'),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}
        const guild = interaction.guild;

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    const guildKey = `${guild.name}_${guild.id}`;

    // Get existing settings
    const currentSettings = await db.settings.get(guildKey);

    if (!currentSettings || !currentSettings.counting_channel) {
      return interaction.reply({
        content: '⚠️ No counting channel is currently set.',
        flags: 64
      });
    }

    // Delete just the counting_channel key
    delete currentSettings.counting_channel;

    // Save updated settings
    await db.settings.set(guildKey, currentSettings);

    await interaction.reply({
      content: '🗑️ Counting channel has been removed.',
      flags: 64
    });
    
    //console logs
    console.log(`[⭐] [REMOVE-COUNTING-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the remove-counting-channel command.`);
  }
};
