const db = require('../../Handlers/database');

module.exports = async (client) => {
  // Get today's date
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayKey = `${day}-${month}`;

  // Get birthdays object from DB
  const birthdays = await db.birthdays.get("users") || {};

  for (const userId in birthdays) {
    if (birthdays[userId] !== todayKey) continue;

    // Check every guild the bot is in
    for (const guild of client.guilds.cache.values()) {
      let member;

      try {
        member = await guild.members.fetch(userId);
      } catch {
        continue; // user not in this guild
      }

      // Pick a safe text channel
      const channel =
        guild.systemChannel ||
        guild.channels.cache.find(ch =>
          ch.isTextBased() &&
          ch.permissionsFor(guild.members.me)?.has("SendMessages")
        );

      if (!channel) continue;

      // Send birthday message
      await channel.send(`🎉 **Happy Birthday ${member}!** 🎂`);
    }
  }
};
