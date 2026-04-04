require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const db = require("../../Handlers/database");
const { Client } = require("discord.js");
const OpenAI = require("openai");

// Run daily at 7AM Pacific/Auckland
const CRON_SCHEDULE = "0 7 * * *";
// const CRON_SCHEDULE = "* * * * *";

const nzDate = new Date().toLocaleDateString('en-GB');
const nzTimestamp = new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" });

let isRunning = false;
let isScheduled = false;
let scheduledTask = null;

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 15000
});

const API_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

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

      const prompt = `You are a creative and it's time for the question of the day. Generate a simple question that will get members chatting. Reply ONLY with a question.`;
      console.log(`[❓] [QOTD] [${nzDate}] [${nzTimestamp}] ${guild.name} Generating question of the day...`);

      const response = await withTimeout(
        openai.chat.completions.create({
          messages: [{ role: 'system', content: prompt }],
          model: "openai/gpt-oss-120b",
          temperature: 1.5
        }),
        API_TIMEOUT_MS,
        'Groq API (QOTD)'
      );

      const question = response.choices?.[0]?.message?.content?.trim() || "What’s your favourite thing about" || "What’s your morning" || "What’s your afternoon"  || "What’s your night";
      const messageContent = roleId
        ? `🎉 **Question of the Day!** 🎉 — <@&${roleId}>\n${question}`
        : `🎉 **Question of the Day!** 🎉\n${question}`;

      const sentMessage = await channel.send({
        content: messageContent,
        allowedMentions: roleId ? { roles: [roleId] } : { parse: [] }
      });

      const key = `${guild.id}.${nzDate} ${nzTimestamp}`;

      await db.qotd.set(key, {
        messageId: sentMessage.id,
        timestamp: now,
        question
      });

      console.log(`[❓] [QOTD] [${nzDate}] [${nzTimestamp}] ${guild.name} Sent new question in ${channel.name} ${channel.id} - ${question}`);
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
    console.log(`[⏰] [QOTD Scheduler] Running at 7:00 AM Pacific/Auckland...`);
    sendQuestionOfTheDay(client);
  }, {
    scheduled: true,
    timezone: 'Pacific/Auckland'
  });

  isScheduled = true;
}

module.exports = startQotd;
