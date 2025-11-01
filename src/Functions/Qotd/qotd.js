require('dotenv').config({ quiet: true });
const cron = require('node-cron');
const db = require("../../Handlers/database");
const { Client } = require("discord.js");
const OpenAI = require("openai");

// Every "0 7 * * *" for daily at 7AM
const time = "0 7 * * *";

let isRunning = false;
let isScheduled = false;
let scheduledTask = null;

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

/**
 * @param {Client} client
 */
async function sendQuestionOfTheDay(client) {
  if (client.shard && client.shard.id !== 0) return;
  if (isRunning) return;

  isRunning = true;

  try {
    const clientGuilds = client.guilds.cache.map(guild => guild);

    for (const guild of clientGuilds) {
      const guildName = guild.name;
      const guildId = guild.id;
      const guildKey = `${guildName}_${guildId}`;

      const qotdSettings = await db.settings.get(guildKey) || {};
      const channelId = qotdSettings.qotdChannelId;
      const roleId = qotdSettings.qotdRoleId; // optional now
      const qotdState = qotdSettings.qotdState || false;

      if (!channelId || !qotdState) {
        continue;
      }

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        continue;
      }

      const lastQotd = await db.qotd.get(guildKey) || {};
      const now = Date.now();

      if (lastQotd.timestamp && now - lastQotd.timestamp < 24 * 60 * 60 * 1000) {
        continue;
      }

      const prompts = [
        `You are a creative kiwi and its time for the question of the day, generate a simple question that will get members chatting.`
        ];

      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      const finalPrompt = `${randomPrompt} Reply ONLY with a question.`;

      console.log(`[❓] [QOTD] Generating question for ${guild.name}...`);

      const response = await openai.chat.completions.create({
        messages: [{ role: 'system', content: finalPrompt }],
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        temperature: 0.7
      });

      const question = response.choices[0].message.content.trim();

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

function startQotd(client) {
  if (isScheduled) {
    return;
  }

  scheduledTask = cron.schedule(time, () => sendQuestionOfTheDay(client), {
    scheduled: true,
    timezone: 'Pacific/Auckland'
  });

  isScheduled = true;
}

module.exports = startQotd;
