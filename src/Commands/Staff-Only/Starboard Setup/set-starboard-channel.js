const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-starboard-channel')
    .setDescription('Set the channel where starboard messages will be sent')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to set for starboard messages')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const guildKey = `${guildName}_${guildId}`;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    const channel = interaction.options.getChannel('channel');

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: 'Please select a valid text channel.', flags: 64 });
    }

    // Load existing settings or initialize
    const existingData = await db.starboard.get(guildKey) || {};

    // Update only the starboardChannel field
    existingData.starboardChannel = channel.id;

    // Save back without overwriting the full entry
    await db.starboard.set(guildKey, existingData);

    await interaction.reply({ content: `✅ Starboard channel set to ${channel.url}.`, flags: 64 });
  },
};
