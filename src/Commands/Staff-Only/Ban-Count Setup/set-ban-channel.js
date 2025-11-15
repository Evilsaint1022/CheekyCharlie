const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-ban-channel')
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
    const guildKey = `${guild.name}_${guild.id}`;

    if (interaction.channel.isDMBased()) {
          return interaction.reply({
            content: "This command cannot be used in DMs.",
            flags: MessageFlags.Ephemeral
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

    try {
      // Fetch current settings
      const currentSettings = await db.settings.get(guildKey) || {};

      // Merge new ban_channel into settings
      const updatedSettings = {
        ...currentSettings,
        ban_channel: channel.id
      };

      // Save updated settings
      await db.settings.set(guildKey, updatedSettings);
      console.log(`[⭐] [SET-BAN-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.username} set the ban channel to ${channel}`);

      await interaction.reply({
        content: `✅ Ban channel successfully set to ${channel}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('[SetBanChannel] Error:', error);
      await interaction.reply({
        content: `❌ There was an error setting the ban channel.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
