require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const db = require("../../Handlers/database");
const { Client } = require("discord.js");
const OpenAI = require("openai");

// Run daily at 7AM Pacific/Auckland
 const CRON_SCHEDULE = "0 7 * * *";

let isRunning = false;
let isScheduled = false;
let scheduledTask = null;

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

/**
 * Sends the Question of the Day (QOTD) message.
 * @param {Client} client
 */
async function sendQuestionOfTheDay(client) {

  if (isRunning) return;

  isRunning = true;

  try {
    const clientGuilds = client.guilds.cache.map(guild => guild);

    for (const guild of clientGuilds) {
      const guildKey = `${guild.name}_${guild.id}`;
      const qotdSettings = await db.settings.get(guildKey) || {};

      const { qotdChannelId: channelId, qotdRoleId: roleId, qotdState = false } = qotdSettings;
      if (!channelId || !qotdState) continue;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) continue;

      const now = Date.now();

      const prompt = `You are a creative kiwi and it's time for the question of the day. Generate a simple question that will get members chatting. Reply ONLY with a question.`;
      console.log(`[❓] [QOTD] Generating question for ${guild.name}...`);

      const response = await openai.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        temperature: 0.7
      });

      const question = response.choices?.[0]?.message?.content?.trim() || "What’s your favourite thing about today?";
      const messageContent = roleId
        ? `🎉 **Question of the Day!** 🎉 — <@&${roleId}>\n${question}`
        : `🎉 **Question of the Day!** 🎉\n${question}`;

      const sentMessage = await channel.send({
        content: messageContent,
        allowedMentions: roleId ? { roles: [roleId] } : { parse: [] }
      });

      await db.qotd.set(guildKey, {
        messageId: sentMessage.id,
        timestamp: now,
        question
      });

      console.log(`[❓] [QOTD] Sent new question in ${guild.name}`);
    }
  } catch (err) {
    console.error("[❌ QOTD Error]", err?.response?.data || err);
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
    console.log("[⏰ QOTD Scheduler] Running at 7:00 AM Pacific/Auckland...");
    sendQuestionOfTheDay(client);
  }, {
    scheduled: true,
    timezone: 'Pacific/Auckland'
  });

  isScheduled = true;
}

module.exports = startQotd;
