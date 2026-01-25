const { Events, EmbedBuilder } = require('discord.js');
const db = require("../../Handlers/database");

const reminderDelay = 2 * 60 * 60 * 1000; // --> 2 hours
// const reminderDelay = 10 * 1000; // --> 10 seconds for testing

const targetBotId = '302050872383242240'; // Disboard bot ID
// const targetBotId = '235148962103951360'; // Testing using Carlbot --> ( DO NOT REMOVE! )

// 🔒 Tracks active reminders so they only run once
const activeReminders = new Set();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {

    if (!message.guild) return;

    const guild = message.guild;
    const guildName = message.guild.name;
    const guildId = message.guild.id;

    const guildKey = `${guildId}`;
    const cooldownKey = guildKey;
    const space = 'ㅤ'
    const top =    `**─────────────────────────────────**`;
    const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;

    const ferns = '<:Ferns:1395219665638391818>';

    try {
      const lastBumpData = await db.lastbump.get(guildKey);
      const lastBumpTimestamp = lastBumpData?.timestamp || 0;

      const currentTimestamp = Date.now();
      const timeSinceLastBump = currentTimestamp - lastBumpTimestamp;

    // If it’s NOT time yet, ignore the message
    if (timeSinceLastBump < reminderDelay) return;

    } catch (err) {
      console.error('Bump check error:', err);
    }


    try {
      const bumpData = await db.bump.get(guildKey);
      if (!bumpData || !bumpData.channelId) return;

      const { channelId, roleId } = bumpData;

      if (message.author.id !== targetBotId || message.channel.id !== channelId) return;
      if (!message.author.bot && !message.content.toLowerCase().includes('Bump done!')) return;

      // Add Rewards to the Bump User
      const newKey = message.interaction?.user?.id || message.mentions.users.first()?.id || message.author.id;
      const rewardAmount = 100;

      let balance = await db.wallet.get(`${newKey}.balance`) || 0;

      balance += rewardAmount;
      await db.wallet.set(`${newKey}.balance`, balance);

      // bumper counter stuff
      const bumpcounter = (await db.bumpcounter.get(guildKey)) ?? 0;
      await db.bumpcounter.set(guildKey, bumpcounter + 1);
      const currentbumpcount = await db.bumpcounter.get(guildKey, bumpcounter);

      const bumpuser = message.interaction?.user?.id || message.mentions.users.first()?.id || message.author.id;

      const bumped = new EmbedBuilder()
        .setDescription(`## 🌿 **__Bump Reminder__** 🌿\n🎁 **_You have been gifted ${ferns}・${rewardAmount.toLocaleString()}_**\nㅤ\n**_Thank you <@${bumpuser}> for Bumping ❤️_**`)
        .setFooter({ text: `Bumper: #${currentbumpcount}` })
        .setColor(0x207e37)
        .setThumbnail(guild.iconURL())

      console.log(`[⬆️] [BUMP REMINDER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Bump Has been Sent in ${message.channel.name} ${message.channel.id}`);
      await message.channel.send({ embeds: [bumped] });

      const now = Date.now();

      await db.lastbump.set(cooldownKey, {
        timestamp: now,
        userId: bumpuser
      });

      // 🔒 Prevent duplicate scheduling
      if (activeReminders.has(guildKey)) return;

      activeReminders.add(guildKey);
      scheduleReminder(message.client, channelId, roleId, cooldownKey, guildKey);

    } catch (err) {
      console.error(`[⬆️] [BUMP REMINDER] Error handling bump message:`, err);
    }
  },
};

async function scheduleReminder(client, channelId, roleId, cooldownKey, guildKey) {
  const bumpInfo = await db.lastbump.get(cooldownKey);
  if (!bumpInfo || !bumpInfo.timestamp || !bumpInfo.userId) return;

  const timePassed = Date.now() - bumpInfo.timestamp;
  const timeLeft = reminderDelay - timePassed;

  const runReminder = async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      const guild = channel.guild;
      const guildName = guild?.name || "Unknown Guild";
      const guildId = guild?.id || "Unknown ID";

      const mention = roleId ? `<@&${roleId}>` : `<@${bumpInfo.userId}>`;

      const bumpreminder = new EmbedBuilder()
        .setDescription(`## 🌿 **__It's Time to Bump!__** 🌿\n**_Its been 2 hours and its time to bump again!_**\n- **_\`You can bump by using the /bump command\`_**\nㅤ\n**_Just a Friendly Reminder ${mention}_** ❤️`)
        .setColor(0x207e37)
        .setThumbnail(guild.iconURL())

      await channel.send({ content: mention, embeds: [bumpreminder] });

      console.log(`[⬆️] [BUMP REMINDER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Its Time to Bump again in ${channel.name} ${channel.id}`);
    } catch (err) {
      console.error(`[⬆️] [BUMP REMINDER] Failed to send reminder:`, err);
    } finally {
      // 🔓 Allow next bump to schedule again
      activeReminders.delete(guildKey);
    }
  };

  if (timeLeft <= 0) {
    await runReminder();
  } else {
    setTimeout(runReminder, timeLeft);
  }
}
