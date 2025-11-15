const { Events, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // Ignore bots
    if (member.user.bot) return;

    const guild = member.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const user = member.user;

    // Get welcome channel from settings
    const settingsKey = `${guildName}_${guildId}`;
    const guildSettings = await db.settings.get(settingsKey) || {};

    // Exit early if welcome channel is not set
    if (!guildSettings.welcomeChannel) return;

    const welcomeChannelId = guildSettings.welcomeChannel;
    const welcomeChannel = guild.channels.cache.get(welcomeChannelId);

    if (!welcomeChannel) {
      console.error(`[WELCOME] Welcome channel not found for guild ${guildName} (${guildId})`);
      return;
    }

    // Calculate account age
    const accountCreatedAt = user.createdAt;
    const accountAge = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)); // days

    // Format account age
    let accountAgeText;
    if (accountAge < 1) {
      accountAgeText = 'Less than a day';
    } else if (accountAge === 1) {
      accountAgeText = '1 day';
    } else if (accountAge < 30) {
      accountAgeText = `${accountAge} days`;
    } else if (accountAge < 365) {
      const months = Math.floor(accountAge / 30);
      accountAgeText = `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(accountAge / 365);
      const remainingDays = accountAge % 365;
      if (remainingDays === 0) {
        accountAgeText = `${years} year${years !== 1 ? 's' : ''}`;
      } else {
        accountAgeText = `${years} year${years !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
      }
    }

    // Create welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`👋 Welcome to ${guild.name}!`)
      .setDescription(`**${user.tag}** has joined the server!`)
      .addFields(
        { name: '👤 User', value: `<@${user.id}>`, inline: true },
        { name: '🆔 Discord ID', value: `\`${user.id}\``, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(accountCreatedAt.getTime() / 1000)}:F>`, inline: false },
        { name: '⏰ Account Age', value: accountAgeText, inline: true },
        { name: '👥 Member Count', value: `${guild.memberCount}`, inline: true }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() || undefined })
      .setTimestamp()
      .setColor(0x00ff00); // Green color for welcome

    try {
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
      console.log(`[👋] [WELCOME] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${user.tag} (${user.id}) joined ${guildName} (${guildId})`);
    } catch (error) {
      console.error(`[WELCOME] Error sending welcome message for ${user.tag} in ${guildName}:`, error);
    }
  },
};

