require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const db = require("../../Handlers/database");
const { Client } = require("discord.js");

// Dev Tesing Timer:
//const CRON_SCHEDULE = "*/1 * * * *"; // 1 minute timer

// Run daily at 7AM Pacific/Auckland
const CRON_SCHEDULE = "0 7 * * *";

const nzDate = new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'});
const nzTimestamp = new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" });

let isRunning = false;
let isScheduled = false;
let scheduledTask = null;

/**
 * Sends the Question of the Day (QOTD) message.
 * @param {Client} client
 */

async function sendQuestionOfTheDay(client) {

  if (isRunning) {
    console.log('[❓] [QOTD] is already Running... skipping this tick.');
    return;
  }

  isRunning = true;

  try {
    const clientGuilds = client.guilds.cache.map(guild => guild);

    for (const guild of clientGuilds) {
      const guildKey = `${guild.id}`;
      const qotdSettings = await db.settings.get(guildKey) || {};

      const { qotdChannelId: channelId, qotdRoleId: roleId, qotdState = false } = qotdSettings;
      if (!channelId || !qotdState) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) continue;

      const now = Date.now();

      const qotdpacks = await db.qotdpacks.get(`Starter_Pack`) || {};
      const qotdhistory = await db.lastqotd.get(`${guild.id}`) || {};

      // Testing the qotdhistory output
      // console.log(qotdpacks);
      // console.log(qotdhistory);

      const questions = Object.values(
      qotdpacks.Default || qotdpacks
      );

      const QOTDHistory = Object.values(
      qotdhistory.Default || qotdhistory
      );

      // Remove questions that have already been asked
      const unusedQuestions = questions.filter(
          question => !QOTDHistory.includes(question)
      );

      if (unusedQuestions.length === 0) {
          console.log(`[❓] [QOTD] [${nzDate}] [${nzTimestamp}] ${guild.name} ${guild.id} No unused questions remaining!`);
          return;
      }

      // Choose a random unused question
      const question = unusedQuestions[
          Math.floor(Math.random() * unusedQuestions.length)
      ];

      console.log(`[❓] [QOTD] [${nzDate}] [${nzTimestamp}] ${guild.name} ${guild.id} Generating question of the day...`);

      // Message Content
      const messageContent = roleId
        ? `🎉 **Question of the Day!** 🎉 — <@&${roleId}>\n${question}`
        : `🎉 **Question of the Day!** 🎉\n${question}`;

      const sentMessage = await channel.send({
        content: messageContent,
        allowedMentions: roleId ? { roles: [roleId] } : { parse: [] }
      });

      const key = `${guild.id}.question_${sentMessage.id}`;

      const currentqotd = await db.lastqotd.get(key) || {};

      currentqotd.question = question
      currentqotd.timestamp = now,

      await db.lastqotd.set(key, currentqotd);

      console.log(`[❓] [QOTD] [${nzDate}] [${nzTimestamp}] ${guild.name} ${guild.id} Sent new question in ${channel.name} ${channel.id} - ${question}`);
    }
  } catch (err) {
    console.error("[❌] [QOTD] [Error]", err?.response?.data || err);
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the QOTD scheduler.
 * @param {Client} client
 */
function startQotd(client) {
  if (isScheduled) return;

  scheduledTask = cron.schedule(CRON_SCHEDULE, () => {
    console.log(`[⏰] [QOTD] Scheduled and Running at 7:00 AM Pacific/Auckland...`);
    sendQuestionOfTheDay(client);
  }, {
    scheduled: true,
    timezone: 'Pacific/Auckland'
  });

  isScheduled = true;
}

module.exports = startQotd;
