const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../Handlers/database'); // Import the database module

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

    const user = interaction.user;
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const guild = interaction.guild;
    const userId = user.id;
    const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
    const member = guild.members.cache.get(userId);

      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
      ) {
        return interaction.reply({
          content: '❌ You do not have permission to set the bump channel!',
          flags: 64
        });
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
    console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the remove-counting-channel command.`);
  }
};
