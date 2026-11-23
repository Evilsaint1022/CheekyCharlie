const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-counting')
    .setDescription('Setup the counting configuration.')
    .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The counting channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    .addStringOption(option =>
      option.setName('correct_emoji')
        .setDescription('Emoji to show when the number is correct')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('wrong_emoji')
        .setDescription('Emoji to show when the number is wrong')
        .setRequired(true)),

  async execute(interaction) {

    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "❌ This command cannot be used in DMs.",
        flags: 64 // ephemeral
      });
    }

    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const guildKey = `${guildId}`;
    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

    const memberRoles = interaction.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (!hasPermission) {
        return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('channel');
    const correctEmoji = interaction.options.getString('correct_emoji');
    const wrongEmoji = interaction.options.getString('wrong_emoji');

    // Database Fetch
    const Existing = db.countingemojis.get(guildKey) || {};
    const currentSettings = db.settings.get(guildKey) || {};

    currentSettings.counting_channel = channel.id;
    Existing.correctEmoji = correctEmoji;
    Existing.wrongEmoji = wrongEmoji;

    // Finally saving the Results back to Database
    await db.countingemojis.set(guildKey, Existing)
    await db.settings.set(guildKey, currentSettings)

    //console logs
    console.log(`[⭐] [SETUP-COUNTING] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the setup-counting command to setup the counting: ${channel} -> ${correctEmoji} -> ${wrongEmoji}.`);

    return interaction.reply({ content: `You have successfully Setup the counting Feature!\nChannel: ${channel},\nCorrectEmoji: ${correctEmoji},\nWrongEmoji: ${wrongEmoji}.`, flags: MessageFlags.Ephemeral });
}}