const { Events } = require('discord.js');
const db = require("../../Handlers/database");

// The actual reminder delay
const reminderDelay = 2 * 60 * 60 * 1000; // --> 2 hours

// const reminderDelay = 10 * 1000; // --> 10 seconds for testing

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {

    // const targetBotId = '235148962103951360'; // Testing using Carlbot --> ( DO NOT REMOVE! )
    const targetBotId = '302050872383242240'; // Disboard bot ID

    if (!message.guild) return;

    const guildName = message.guild.name;
    const guildId = message.guild.id;

    const guildKey = `${guildId}`;
    const cooldownKey = guildKey;
    const space = 'ㅤ'

    try {
      const bumpData = await db.bump.get(guildKey);
      if (!bumpData || !bumpData.channelId) return;

      const { channelId, roleId } = bumpData;

      if (message.author.id !== targetBotId || message.channel.id !== channelId) return;

      const bumpcounter = (await db.bumpcounter.get(guildKey)) ?? 0;

      await db.bumpcounter.set(guildKey, bumpcounter + 1);

      const currentbumpcount = await db.bumpcounter.get(guildKey, bumpcounter);

      console.log(`[⬆️] [BUMP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Bump Has been Scheduled!`);
      await message.channel.send(`# 🎉 **__You bumped the Server!__** 🎉\n> **Thank you for Bumping ❤️**\n> **Bumper #${currentbumpcount}**`);

      const now = Date.now();

      await db.lastbump.set(cooldownKey, {
        timestamp: now,
        userId: message.interaction?.user?.id || message.mentions.users.first()?.id || message.author.id
      });

      scheduleReminder(message.client, channelId, roleId, cooldownKey, guildKey);
    } catch (err) {
      console.error(`[⬆️] [BUMP] Error handling bump message:`, err);
    }
  },
};

async function scheduleReminder(client, channelId, roleId, cooldownKey, guildKey,) {
  const bumpInfo = await db.lastbump.get(cooldownKey);
  if (!bumpInfo || !bumpInfo.timestamp || !bumpInfo.userId) return;

  const timePassed = Date.now() - bumpInfo.timestamp;
  const timeLeft = reminderDelay - timePassed;

  const runReminder = async () => {

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      // Get guild info properly
      const guild = channel.guild;
      const guildName = guild?.name || "Unknown Guild";
      const guildId = guild?.id || "Unknown ID";

      const mention = roleId ? `<@&${roleId}>` : `<@${bumpInfo.userId}>`;
      await channel.send(`${mention}\n**It's time to bump the server again! ❤️**`);
      console.log(`[⬆️] [BUMP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Its Time to Bump!`);
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