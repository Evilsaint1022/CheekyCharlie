// handlers/AI/AI-Response.js
const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require("openai");
const db = require('../Handlers/database');
const { Client, Message } = require('discord.js');

const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPT_KEY).digest();
const IV = Buffer.alloc(16, 0);

const openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });

const cheekycharlie = `<:CheekyCharlie:1426934124060610713>`;

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * 
 * @param {Client} client 
 * @param {Message} message 
 * @returns 
 */

async function handleAIMessage(client, message) {

const DiscordPings = message.content.match(/@(everyone|here)/g) || [];

  // Get @everyone / @here mentions
const everyonePing = message.mentions.everyone;

// Get @here mentions
const herePing = message.mentions.here;

// Get role mentions (we will ignore these)
const roleMentions = message.mentions.roles;

// Get user mentions (we will ignore the bot)
const userMentions = message.mentions.users.filter(
  user => user.id !== message.client.user.id
);
  if (everyonePing) return;
  if (herePing) return;
  if (roleMentions.size > 0) return;
  if (userMentions.size > 0) return;
  if (DiscordPings.length > 0) return;
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const ignoredChannels = await db.settings.get(`${message.guild.id}.ignoredAIChannels`) || [];

  if ( ignoredChannels.includes(message.channel.id) ) return;
  if ( message.channel.parent ) {
    if ( ignoredChannels.includes(message.channel.parent.id) ) return;
  }

  const userContent = message.content.replace(`<@${client.user.id}>`, '').trim();
  const encryptedUsername = encrypt(message.author.tag);

  console.log(`📨 Message from ${message.author.tag} (Encrypted: ${encryptedUsername}): ${userContent}`);

  try {
    await message.channel.sendTyping();

    let memory = [];
    const chatlog = await db.ai_history.get(encryptedUsername + ".history");

    if (chatlog && Array.isArray(chatlog)) {
      if (chatlog.length > 22) {
        chatlog.shift();
        chatlog.shift();
      }
      memory = chatlog;
    }

    memory.push({ role: 'user', content: userContent });

    const systemPrompt_raw = fs.readFileSync("./src/AI-Response/systemPrompt.txt", "utf8");

    const userInfo = `
    Display Name (Use this to adress to the user): ${await message.author.displayName}
    Username: ${await message.author.username}
    `

    const nzTime = new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" });

    const systemPrompt = systemPrompt_raw.replaceAll("{USER_INFO}", userInfo).replaceAll("{NZ_DATE_TIME}", nzTime)

    console.log('🧠 Sending message to Groq...');
    const response = await openai.chat.completions.create({

      messages: [
        ...memory,
        { role: 'system', content: systemPrompt },
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct"

    });

    const reply = response.choices[0].message.content;
    console.log(`🤖 Groq Reply: ${reply}`);
    message.reply(cheekycharlie + reply);

    memory.push({ role: 'assistant', content: reply });
    await db.ai_history.set(encryptedUsername + ".history", memory);
    console.log('📁 Chat logged!');
  } catch (err) {
    console.error('❌ Error talking to Groq:', err);
    message.reply('⚠️ Sorry, I had trouble thinking. Try again later.');
  }
}

module.exports = { handleAIMessage };
