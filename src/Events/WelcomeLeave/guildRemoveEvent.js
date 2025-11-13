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

    // Check if this was a kick - if so, skip processing (kick event will handle it)
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
        // This was a kick, let the kick event handle it
        return;
      }
    } catch (error) {
      // If audit log check fails, continue processing as a leave
      console.error(`[LEAVE] Error checking audit logs for ${user.tag} in ${guildName}:`, error);
    }

    // Get leave channel from settings
    const settingsKey = `${guildName}_${guildId}`;
    const guildSettings = await db.settings.get(settingsKey) || {};

    // Exit early if leave channel is not set
    if (!guildSettings.leaveChannel) return;

    const leaveChannelId = guildSettings.leaveChannel;
    const leaveChannel = guild.channels.cache.get(leaveChannelId);

    if (!leaveChannel) {
      console.error(`[LEAVE] Leave channel not found for guild ${guildName} (${guildId})`);
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

    // Create leave embed
    const leaveEmbed = new EmbedBuilder()
      .setTitle(`👋 ${user.tag} left the server`)
      .setDescription(`**${user.tag}** has left ${guild.name}.`)
      .addFields(
        { name: '👤 User', value: `${user.tag}`, inline: true },
        { name: '🆔 Discord ID', value: `\`${user.id}\``, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(accountCreatedAt.getTime() / 1000)}:F>`, inline: false },
        { name: '⏰ Account Age', value: accountAgeText, inline: true },
        { name: '⏱️ Time in Server', value: serverTimeText, inline: true },
        { name: '👥 Member Count', value: `${guild.memberCount}`, inline: true }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() || undefined })
      .setTimestamp()
      .setColor(0xff0000); // Red color for leave

    try {
      await leaveChannel.send({ embeds: [leaveEmbed] });
      console.log(`[👋] [LEAVE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${user.tag} (${user.id}) left ${guildName} (${guildId})`);
    } catch (error) {
      console.error(`[LEAVE] Error sending leave message for ${user.tag} in ${guildName}:`, error);
    }
  },
};

