const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
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
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
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
    console.log(`[⭐] [SET-COUNTING-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the set-counting-channel command.`);
  }
};
