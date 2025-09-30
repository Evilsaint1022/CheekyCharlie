const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-counting-channel')
    .setDescription('Set the channel where the counting game will happen.')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The counting channel')
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

    const channel = interaction.options.getChannel('channel');
    const guild = interaction.guild;
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const userId = interaction.user.id;

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

    // Get existing data (if any)
    const currentSettings = await db.settings.get(guildKey) || {};

    // Merge new value without overwriting existing ones
    const updatedSettings = {
      ...currentSettings,
      counting_channel: channel.id
    };

    await db.settings.set(guildKey, updatedSettings);

    await interaction.reply({
      content: `✅ Counting channel has been set to <#${channel.id}>.`,
      flags: 64
    });
    //console logs
    console.log(`[SET-COUNTING-CHANNEL] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the set-counting-channel command.`);
  }
};
