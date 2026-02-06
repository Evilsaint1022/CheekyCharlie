const cron = require('node-cron');
const db = require('../../Handlers/database');

module.exports = async (client) => {

  cron.schedule('0 */5 * * * *', async () => {

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayKey = `${todayDay}-${todayMonth}`;

    for (const guild of client.guilds.cache.values()) {

      const guildBirthdays = await db.birthdays.get(guild.id);
      if (!guildBirthdays) continue;

      // ✅ load ONCE — preserves existing entries
      const sentData = await db.birthdays_sent.get(guild.id) || {};

      for (const userId in guildBirthdays) {
        const bday = guildBirthdays[userId];

        const userKey =
          `${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}`;

        if (userKey !== todayKey) continue;

        // 🔒 per-user duplicate protection
        if (sentData[userId] === todayKey + "-" + bday.year) {
          continue;
        }

        let member;
        try {
          member = await guild.members.fetch(userId);
        } catch {
          console.log(`[🎂] [Birthdays] Failed to fetch member ${userId} in guild ${guild.id}`)
          continue;
        }

        const birthdaysettings = await db.birthdaysettings.get(guild.id) || {};
        const channelId = birthdaysettings.birthdaychannel;
        const roleId = birthdaysettings.birthdaypingrole;
        const givenRoleId = birthdaysettings.birthdaygivenrole;

        if (!channelId) continue;

        // fetch channel
        let channel;
        try {
          channel = await guild.channels.fetch(channelId);
        } catch {
          console.log(`[🎂] [Birthdays] Failed to fetch birthday channel ${channelId} in guild ${guild.id}`)
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
        const membername = member.user.username;

        console.log(`[🎂] [Birthdays] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Sending birthday message for ${membername} in channel ${channel.name} ${channel.id}`);

        await channel.send(
          `${role ? `\n\n<@&${role.id}>` : ''}\n🎉 **Happy Birthday ${member}!** 🎉
        🎂 You are now **${age} years old**! 🎂`);

        // 🎁 give birthday role (optional)
        if (givenRoleId) {
          try {
            const givenRole = await guild.roles.fetch(givenRoleId);
            if (givenRole && !member.roles.cache.has(givenRole.id)) {
              await member.roles.add(givenRole);
            }
          } catch {
            console.log(`[🎂] [Birthdays] Failed to give birthday role to ${member.id}`);
          }
        }

        // ✅ ONLY touch this user’s entry
        sentData[userId] = todayKey + "-" + bday.year;
      }

        const birthdaysettings = await db.birthdaysettings.get(guild.id) || {};
        const channelId = birthdaysettings.birthdaychannel;
        const roleId = birthdaysettings.birthdaypingrole;
        const givenRoleId = birthdaysettings.birthdaygivenrole;

      // 💾 save once per guild (more efficient & safer)
      if (Object.keys(sentData).length > 0) {
        await db.birthdays_sent.set(guild.id, sentData);
      }

      // 🔹 Remove birthdaygivenrole from users whose birthday is NOT today
      if (givenRoleId) {
        try {
          const givenRole = await guild.roles.fetch(givenRoleId);
          if (!givenRole) continue;

          const membersWithRole = givenRole.members;

          for (const [memberId, member] of membersWithRole) {
            const bday = guildBirthdays[memberId];
            if (!bday) continue;

            const userKey =
              `${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}`;

            // If today is NOT their birthday, remove the role
            if (userKey !== todayKey && member.roles.cache.has(givenRole.id)) {
              await member.roles.remove(givenRole).catch(() => {
                console.log(`[🎂] [Birthdays] Failed to remove birthday role from ${member.id}`);
              });
            }
          }
        } catch (err) {
          console.log(`[🎂] [Birthdays] Error processing birthday role removal:`, err);
        }
      }
    }
  });
};