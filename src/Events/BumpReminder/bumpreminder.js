const { Events } = require('discord.js');
const db = require("../../Handlers/database");

const reminderDelay = 2 * 60 * 60 * 1000; // 2 hours

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const targetBotId = '302050872383242240'; // Disboard bot ID
    if (!message.guild) return;

    const guildKey = `${message.guild.name}_${message.guild.id}`;
    const cooldownKey = guildKey;

    try {
      const bumpData = await db.bump.get(guildKey);
      if (!bumpData || !bumpData.channelId || !bumpData.roleId) return;

      const { channelId, roleId } = bumpData;

      if (message.author.id !== targetBotId || message.channel.id !== channelId) return;

      console.log(`[⬆️] [BUMP] ${guildKey} - Valid Bump Detected`);
      await message.channel.send(`**You bumped the Server!**\n**Thank you for Bumping ❤️**`);

      const now = Date.now();
      await db.bumpcooldown.set(cooldownKey, now);
      await db.lastbump.set(cooldownKey, now);

      scheduleReminder(message.client, channelId, roleId, cooldownKey);
    } catch (err) {
      console.error(`[⬆️] [BUMP] Error handling bump message:`, err);
    }
  },
};

async function scheduleReminder(client, channelId, roleId, cooldownKey) {
  const lastBump = await db.bumpcooldown.get(cooldownKey);
  if (!lastBump) return;

  const timePassed = Date.now() - lastBump;
  const timeLeft = reminderDelay - timePassed;

  const runReminder = async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;
      await channel.send(`<@&${roleId}>\n**It's time to bump the server again! ❤️**`);
      console.log(`[⬆️] [BUMP] Reminder Sent in ${guildKey}`);
    } catch (err) {
      console.error(`[⬆️] [BUMP] Failed to send reminder:`, err);
    }
  };

  if (timeLeft <= 0) {
    await runReminder();
  } else {
    setTimeout(runReminder, timeLeft);
  }
}
