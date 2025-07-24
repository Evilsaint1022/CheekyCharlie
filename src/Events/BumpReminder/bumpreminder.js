// In-memory cache of last bump info: { timestamp, userId }
const lastBumpCache = new Map();

const { Events } = require('discord.js');
const db = require("../../Handlers/database");

const reminderDelay = 2 * 60 * 60 * 1000; // 2 hours
const targetBotId = '302050872383242240'; // Disboard bot ID

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
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

      // Save both timestamp and userId to DB
      const bumpRecord = { timestamp: now, userId: message.author.id };
      await db.bumpcooldown.set(cooldownKey, bumpRecord);
      await db.lastbump.set(cooldownKey, bumpRecord);

      // Update in-memory cache
      lastBumpCache.set(cooldownKey, bumpRecord);

      scheduleReminder(message.client, channelId, roleId, cooldownKey, guildKey);
    } catch (err) {
      console.error(`[⬆️] [BUMP] Error handling bump message:`, err);
    }
  },
};

// Load last bump data on startup
async function loadLastBumpCache(client) {
  try {
    const allCooldowns = await db.bumpcooldown.getAll(); // { key: { timestamp, userId } }

    if (!allCooldowns) return;

    for (const [cooldownKey, bumpRecord] of Object.entries(allCooldowns)) {
      lastBumpCache.set(cooldownKey, bumpRecord);
    }

    console.log(`[⬆️] [BUMP] Loaded ${lastBumpCache.size} last bump records into cache`);

    startReminderLoop(client);
  } catch (err) {
    console.error('[⬆️] [BUMP] Failed to load last bump cache:', err);
  }
}

async function startReminderLoop(client) {
  for (const [cooldownKey, bumpRecord] of lastBumpCache.entries()) {
    try {
      const bumpData = await db.bump.get(cooldownKey);
      if (!bumpData) continue;

      scheduleReminder(client, bumpData.channelId, bumpData.roleId, cooldownKey, cooldownKey);
    } catch (err) {
      console.error(`[⬆️] [BUMP] Failed to schedule reminder for ${cooldownKey}:`, err);
    }
  }
}

async function scheduleReminder(client, channelId, roleId, cooldownKey, guildKey) {
  const bumpRecord = lastBumpCache.get(cooldownKey);
  if (!bumpRecord) return;

  const timePassed = Date.now() - bumpRecord.timestamp;
  const timeLeft = reminderDelay - timePassed;

  const runReminder = async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      await channel.send(`<@&${roleId}>\n**It's time to bump the server again! ❤️**`);
      console.log(`[⬆️] [BUMP] Reminder Sent in ${guildKey}`);

      const now = Date.now();
      const newBumpRecord = { timestamp: now, userId: bumpRecord.userId }; // keep userId or reset if you want

      // Update cache & DB with new timestamp (userId can stay or reset to null)
      lastBumpCache.set(cooldownKey, newBumpRecord);
      await db.bumpcooldown.set(cooldownKey, newBumpRecord);

      // Schedule next reminder
      scheduleReminder(client, channelId, roleId, cooldownKey, guildKey);
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

module.exports.loadLastBumpCache = loadLastBumpCache;
