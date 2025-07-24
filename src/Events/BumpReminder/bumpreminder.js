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

    try {
      const bumpData = await db.bump.get(guildKey);
      if (!bumpData || !bumpData.channelId || !bumpData.roleId) return;

      const { channelId, roleId } = bumpData;

      if (message.author.id !== targetBotId || message.channel.id !== channelId) return;

      console.log(`[⬆️] [BUMP] ${guildKey} - Valid Bump Detected`);
      await message.channel.send(`**You bumped the Server!**\n**Thank you for Bumping ❤️**`);

      const now = Date.now();

      // Save both timestamp and userId to DB (only lastbump)
      const bumpRecord = { timestamp: now, userId: message.author.id };
      await db.lastbump.set(guildKey, bumpRecord);

      // Update in-memory cache
      lastBumpCache.set(guildKey, bumpRecord);

      scheduleReminder(message.client, channelId, roleId, guildKey, guildKey);
    } catch (err) {
      console.error(`[⬆️] [BUMP] Error handling bump message:`, err);
    }
  },
};

// Load last bump data on startup
async function loadLastBumpCache(client) {
  try {
    const allLastBumps = await db.lastbump.get(); // get ALL entries

    if (!allLastBumps) return;

    for (const [guildKey, bumpRecord] of Object.entries(allLastBumps)) {
      let record;
      if (typeof bumpRecord === 'object' && bumpRecord !== null && 'timestamp' in bumpRecord) {
        record = {
          timestamp: bumpRecord.timestamp,
          userId: bumpRecord.userId || null,
        };
      } else if (typeof bumpRecord === 'number') {
        record = {
          timestamp: bumpRecord,
          userId: null,
        };
      } else {
        console.warn(`[⬆️] [BUMP] Unexpected lastBump format for ${guildKey}:`, bumpRecord);
        continue;
      }
      lastBumpCache.set(guildKey, record);
    }

    console.log(`[⬆️] [BUMP] Loaded ${lastBumpCache.size} last bump records into cache`);

    startReminderLoop(client);
  } catch (err) {
    console.error('[⬆️] [BUMP] Failed to load last bump cache:', err);
  }
}

async function startReminderLoop(client) {
  for (const [guildKey, bumpRecord] of lastBumpCache.entries()) {
    try {
      const bumpData = await db.bump.get(guildKey);
      if (!bumpData || !bumpData.channelId || !bumpData.roleId) continue;

      scheduleReminder(client, bumpData.channelId, bumpData.roleId, guildKey, guildKey);
    } catch (err) {
      console.error(`[⬆️] [BUMP] Failed to schedule reminder for ${guildKey}:`, err);
    }
  }
}


async function scheduleReminder(client, channelId, roleId, guildKey, displayKey) {
  const bumpRecord = lastBumpCache.get(guildKey);
  if (!bumpRecord) return;

  const timePassed = Date.now() - bumpRecord.timestamp;
  const timeLeft = reminderDelay - timePassed;

  const runReminder = async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      await channel.send(`<@&${roleId}>\n**It's time to bump the server again! ❤️**`);
      console.log(`[⬆️] [BUMP] Reminder Sent in ${displayKey}`);

      const now = Date.now();
      const newBumpRecord = { timestamp: now, userId: bumpRecord.userId }; // keep userId or reset if you want

      // Update cache & DB with new timestamp (userId can stay or reset)
      lastBumpCache.set(guildKey, newBumpRecord);
      await db.lastbump.set(guildKey, newBumpRecord);

      // Schedule next reminder
      scheduleReminder(client, channelId, roleId, guildKey, displayKey);
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
