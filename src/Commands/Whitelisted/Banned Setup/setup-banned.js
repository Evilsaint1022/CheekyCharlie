const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-banned')
    .setDescription('Set the channel where ^banned messages are counted')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to use for banned messages')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guild = interaction.guild;
    const guildKey = `${guild.id}`;

    if (interaction.channel.isDMBased()) {
          return interaction.reply({
            content: "This command cannot be used in DMs.",
            flags: MessageFlags.Ephemeral
          });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    try {
      // Fetch current settings
      const currentSettings = await db.settings.get(guildKey) || {};

      currentSettings.ban_channel = channel.id

      // Save updated settings
      db.settings.set(guildKey, currentSettings);
      console.log(`[⭐] [SETUP-BANNED-CHANNEL] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.username} set the banned channel to ${channel}`);

      await interaction.reply({
        content: `✅ Banned channel successfully set to ${channel}`,
        flags: 64
      });
    } catch (error) {
      console.error('[SetBannedChannel] Error:', error);
      await interaction.reply({
        content: `❌ There was an error setting the banned channel.`,
        flags: 64
      });
    }
  }
};
