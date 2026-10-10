require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const db = require("../../Handlers/database");
const { Client } = require("discord.js");
const OpenAI = require("openai");

// Dev Tesing Timer:
// const CRON_SCHEDULE = "*/1 * * * *"; // 1 minute timer

// Run daily at 7AM Pacific/Auckland
const CRON_SCHEDULE = "0 7 * * *";

const nzDate = new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'});
const nzTimestamp = new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" });

let isRunning = false;
let isScheduled = false;
let scheduledTask = null;

  // We no Longer use Groq
  // const GROQ_API_KEY = API_KEY;
  const OPENROUTER = process.env.OPENROUTER;

  if (!OPENROUTER) {
    console.warn('OPENROUTER Key is not set!')
    return;
  };

const openai = new OpenAI({
  apiKey: OPENROUTER,
  baseURL: "https://openrouter.ai/api/v1",
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

      const qotdhistory = await db.lastqotd.get(`${guild.id}`) || {}; 
      
      // Keep the most recent 20 questions in the AI prompt.
      if (qotdhistory.length > 22) {
      const qotdhistory = qotdhistory.slice(-20);
      }

      const prompt = `
      You are a creative assistant generating a Question of the Day
      for a Discord server.

      Generate ONE simple, interesting question that encourages
      members to chat.

      IMPORTANT RULES:
      - Reply ONLY with a single question.
      - Do not repeat any question from the previous questions list.
      - Do not ask a question that is essentially the same as one
        in the previous questions list.
      - Choose a different topic or angle if a similar question exists.
      - Keep the question suitable for a general Discord community.

      Previous questions to avoid:
      ${JSON.stringify(qotdhistory)}`;

      console.log(`[❓] [QOTD] [${nzDate}] [${nzTimestamp}] ${guild.name} Generating question of the day...`);

      const response = await withTimeout(
        openai.chat.completions.create({
          
          messages: [
          { role: 'system', content: prompt }
          ],
          model: "anthropic/claude-haiku-5.5",
          temperature: 1.5
        }),
        API_TIMEOUT_MS,
        'OPENROUTER API (QOTD)'
      );

      const question = response.choices?.[0]?.message?.content?.trim() || "What’s your favourite thing about" || "What’s your morning" || "What’s your afternoon"  || "What’s your night";
      const messageContent = roleId
        ? `🎉 **Question of the Day!** 🎉 — <@&${roleId}>\n${question}`
        : `🎉 **Question of the Day!** 🎉\n${question}`;

      const sentMessage = await channel.send({
        content: messageContent,
        allowedMentions: roleId ? { roles: [roleId] } : { parse: [] }
      });

      const key = `${guild.id}.${now}`;

      const currentqotd = await db.lastqotd.get(key) || {};

      currentqotd.messageId = sentMessage.id,
      currentqotd.timestamp = now,
      currentqotd.question = question

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
    console.log(`[⏰] [QOTD Scheduler] Running at 7:00 AM Pacific/Auckland...`);
    sendQuestionOfTheDay(client);
  }, {
    scheduled: true,
    timezone: 'Pacific/Auckland'
  });

  isScheduled = true;
}

module.exports = startQotd;
