const cron = require('node-cron');
const db = require('../../Handlers/database');

// 🔧 TEST CHANNEL (FOR DEBUGGING)
const TEST_CHANNEL_ID = '1395774255928442880';

module.exports = async (client) => {

  cron.schedule('0 */1 * * * *', async () => {

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayKey = `${todayDay}-${todayMonth}-${todayYear}`;

    for (const guild of client.guilds.cache.values()) {

      const guildBirthdays = await db.birthdays.get(guild.id);
      if (!guildBirthdays) continue;

      // ✅ load ONCE — preserves existing entries
      const sentData = await db.birthdays_sent.get(guild.id) || {};

      for (const userId in guildBirthdays) {
        const bday = guildBirthdays[userId];

        const userKey =
          `${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}-${bday.year}`;

        if (userKey !== todayKey) continue;

        // 🔒 per-user duplicate protection
        if (sentData[userId] === todayKey) {
          continue;
        }

        let member;
        try {
          member = await guild.members.fetch(userId);
        } catch {
          continue;
        }

        const birthdaysettings = await db.birthdaysettings.get(guild.id) || {};
        const channelId = birthdaysettings.birthdaychannel;
        const roleId = birthdaysettings.birthdaypingrole;

        if (!channelId) continue;

        // fetch channel
        let channel;
        try {
          channel = await guild.channels.fetch(channelId);
        } catch {
          continue;
        }

        if (!channel || !channel.isTextBased()) continue;

        // fetch role (optional)
        let role = null;
        if (roleId) {
          try {
            role = await guild.roles.fetch(roleId);
          } catch {
            role = null;
          }
        }

        const age = todayYear - bday.year;

        await channel.send(
          `🎉 **Happy Birthday ${member}!** 🎉
        🎂 You are now **${age} years old**! 🎂
        ${role ? `\n<@&${role.id}>` : ''}`
        );

        // ✅ ONLY touch this user’s entry
        sentData[userId] = todayKey;
      }

      // 💾 save once per guild (more efficient & safer)
      if (Object.keys(sentData).length > 0) {
        await db.birthdays_sent.set(guild.id, sentData);
      }
    }
  });
};
