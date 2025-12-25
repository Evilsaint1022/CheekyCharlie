const { Events } = require('discord.js');
const db = require("../../Handlers/database");

// const reminderDelay = 10 * 1000; // --> 10 seconds for testing
 const reminderDelay = 2 * 60 * 60 * 1000; // --> 2 hours

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
    const top =    `**─────────────────────────────────**`;
    const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;

    const ferns = '<:Ferns:1395219665638391818>';

    try {
      const bumpData = await db.bump.get(guildKey);
      if (!bumpData || !bumpData.channelId) return;

      const { channelId, roleId } = bumpData;

      if (message.author.id !== targetBotId || message.channel.id !== channelId) return;

      // Add Rewards to the Bump User
      const newKey = message.interaction?.user?.id || message.mentions.users.first()?.id || message.author.id;
      const rewardAmount = 100;

       let balance = await db.wallet.get(`${newKey}.balance`) || 0;

       // Add reward
        balance += rewardAmount;

        await db.wallet.set(`${newKey}.balance`, balance);

      // bumper counter stuff
      const bumpcounter = (await db.bumpcounter.get(guildKey)) ?? 0;
      await db.bumpcounter.set(guildKey, bumpcounter + 1);
      const currentbumpcount = await db.bumpcounter.get(guildKey, bumpcounter);

      const bumpuser = message.interaction?.user?.id || message.mentions.users.first()?.id || message.author.id;

      console.log(`[⬆️] [BUMPREMINDER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Bump Has been Sent in ${message.channel.name} ${message.channel.id}`);
      await message.channel.send(`# 🎉**__<@${bumpuser}>__**🎉\n> **_You have been given ${ferns}・${rewardAmount.toLocaleString()}_**\n> **Thank you for Bumping ❤️**\nㅤ\n**🌿 Bumper #${currentbumpcount} 🌿**`);

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
      await channel.send(`# 🎉**__It's Bump Time!__**🎉\n> **_Its been 2 hours and its time to bump again!_**\n> **_Friendly Reminder ${mention}_** ❤️`);
      console.log(`[⬆️] [BUMPREMINDER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Its Time to Bump again in ${channel.name} ${channel.id}`);
    } catch (err) {
      console.error(`[⬆️] [BUMPREMINDER] Failed to send reminder:`, err);
    }
  };

  if (timeLeft <= 0) {
    await runReminder();
  } else {
    setTimeout(runReminder, timeLeft);
  }
}