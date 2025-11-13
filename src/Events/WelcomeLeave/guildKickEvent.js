const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    // Ignore bots
    if (member.user.bot) return;

    const guild = member.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const user = member.user;

    // Check if this was a kick by looking at audit logs
    let kicked = false;
    let kickReason = 'No reason provided';
    let executor = null;

    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
        limit: 5
      });

      const kickLog = auditLogs.entries.find(entry => 
        entry.target.id === user.id &&
        Date.now() - entry.createdTimestamp < 5000 // Within last 5 seconds
      );

      if (kickLog) {
        kicked = true;
        kickReason = kickLog.reason || 'No reason provided';
        executor = kickLog.executor;
      }
    } catch (error) {
      console.error(`[KICK] Error fetching audit logs for ${user.tag} in ${guildName}:`, error);
    }

    // If this wasn't a kick, don't process it (let the leave event handle it)
    if (!kicked) return;

    // Get kick channel from settings
    const settingsKey = `${guildName}_${guildId}`;
    const guildSettings = await db.settings.get(settingsKey) || {};

    // Exit early if kick channel is not set
    if (!guildSettings.kickLogChannel) return;

    const kickChannelId = guildSettings.kickLogChannel;
    const kickChannel = guild.channels.cache.get(kickChannelId);

    if (!kickChannel) {
      console.error(`[KICK] Kick log channel not found for guild ${guildName} (${guildId})`);
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

    // Calculate how long they were in the server
    const joinedAt = member.joinedAt;
    let serverTimeText = 'Unknown';
    if (joinedAt) {
      const serverTime = Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)); // days
      if (serverTime < 1) {
        serverTimeText = 'Less than a day';
      } else if (serverTime === 1) {
        serverTimeText = '1 day';
      } else if (serverTime < 30) {
        serverTimeText = `${serverTime} days`;
      } else if (serverTime < 365) {
        const months = Math.floor(serverTime / 30);
        serverTimeText = `${months} month${months !== 1 ? 's' : ''}`;
      } else {
        const years = Math.floor(serverTime / 365);
        const remainingDays = serverTime % 365;
        if (remainingDays === 0) {
          serverTimeText = `${years} year${years !== 1 ? 's' : ''}`;
        } else {
          serverTimeText = `${years} year${years !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
        }
      }
    }

    // Create kick embed
    const kickEmbed = new EmbedBuilder()
      .setTitle(`👢 ${user.tag} has been kicked`)
      .setDescription(`**${user.tag}** has been kicked from ${guild.name}.`)
      .addFields(
        { name: '👤 User', value: `${user.tag}`, inline: true },
        { name: '🆔 Discord ID', value: `\`${user.id}\``, inline: true },
        { name: '👮 Kicked by', value: executor ? `${executor.tag}` : 'Unknown', inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(accountCreatedAt.getTime() / 1000)}:F>`, inline: false },
        { name: '⏰ Account Age', value: accountAgeText, inline: true },
        { name: '⏱️ Time in Server', value: serverTimeText, inline: true },
        { name: '📝 Reason', value: kickReason, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() || undefined })
      .setTimestamp()
      .setColor(0xffa500); // Orange color for kick

    try {
      await kickChannel.send({ embeds: [kickEmbed] });
      console.log(`[👢] [KICK] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${user.tag} (${user.id}) was kicked from ${guildName} (${guildId}) by ${executor ? executor.tag : 'Unknown'}`);
    } catch (error) {
      console.error(`[KICK] Error sending kick message for ${user.tag} in ${guildName}:`, error);
    }
  },
};

