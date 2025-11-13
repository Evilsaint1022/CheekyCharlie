const { Events, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    const guild = ban.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const user = ban.user;

    // Get ban channel from settings
    const settingsKey = `${guildName}_${guildId}`;
    const guildSettings = await db.settings.get(settingsKey) || {};

    // Exit early if ban channel is not set
    if (!guildSettings.banLogChannel) return;

    const banChannelId = guildSettings.banLogChannel;
    const banChannel = guild.channels.cache.get(banChannelId);

    if (!banChannel) {
      console.error(`[BAN] Ban log channel not found for guild ${guildName} (${guildId})`);
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

    // Fetch ban reason if available
    let banReason = ban.reason || 'No reason provided';

    // Create ban embed
    const banEmbed = new EmbedBuilder()
      .setTitle(`🔨 ${user.tag} has been banned`)
      .setDescription(`**${user.tag}** has been banned from ${guild.name}.`)
      .addFields(
        { name: '👤 User', value: `${user.tag}`, inline: true },
        { name: '🆔 Discord ID', value: `\`${user.id}\``, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(accountCreatedAt.getTime() / 1000)}:F>`, inline: false },
        { name: '⏰ Account Age', value: accountAgeText, inline: true },
        { name: '📝 Reason', value: banReason, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() || undefined })
      .setTimestamp()
      .setColor(0xff0000); // Red color for ban

    try {
      await banChannel.send({ embeds: [banEmbed] });
      console.log(`[🔨] [BAN] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${user.tag} (${user.id}) was banned from ${guildName} (${guildId})`);
    } catch (error) {
      console.error(`[BAN] Error sending ban message for ${user.tag} in ${guildName}:`, error);
    }
  },
};

