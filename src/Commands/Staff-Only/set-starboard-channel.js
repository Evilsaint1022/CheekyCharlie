const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, MessageFlags, ChannelType } = require('discord.js');
const db = require('../../Handlers/database');

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

    const user = interaction.user;
    const userId = user.id;
    const guild = interaction.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const guildKey = `${guildName}_${guildId}`;

    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildKey}.whitelistedRoles`) || [];
    const member = guild.members.cache.get(userId);
    const memberRoles = interaction.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !hasPermission
    ) {
      return interaction.reply({
        content: '❌ You do not have permission to set the starboard channel!',
        flags: 64
      });
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
