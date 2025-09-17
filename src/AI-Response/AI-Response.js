// handlers/AI/AI-Response.js
const fs = require('fs');
const crypto = require('crypto');
const Groq = require("groq-sdk");
const db = require('../Handlers/database');
const { Client, Message } = require('discord.js');

const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPT_KEY).digest();
const IV = Buffer.alloc(16, 0);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const ignoredChannels = await db.settings.get(`${message.guild.name}_${message.guild.id}.ignoredAIChannels`) || [];

  if ( ignoredChannels.includes(message.channel.id) ) return;
  if ( ignoredChannels.includes(message.channel.parent.id) ) return;

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

    const systemPrompt = fs.readFileSync("./src/AI-Response/systemPrompt.txt", "utf8");

    console.log('🧠 Sending message to OpenAI...');
    const response = await groq.chat.completions.create({

      messages: [
        ...memory,
        { role: 'system', content: systemPrompt },
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct"

    });

    const reply = response.choices[0].message.content;
    console.log(`🤖 OpenAI Reply: ${reply}`);
    message.reply(reply);

    memory.push({ role: 'assistant', content: reply });
    await db.ai_history.set(encryptedUsername + ".history", memory);
    console.log('📁 Chat logged!');
  } catch (err) {
    console.error('❌ Error talking to OpenAI:', err);
    message.reply('⚠️ Sorry, I had trouble thinking. Try again later.');
  }
}

module.exports = { handleAIMessage };
