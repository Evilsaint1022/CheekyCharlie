// handlers/AI/AI-Response.js
const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require("openai");
const db = require('../Handlers/database');
const { Client, Message, AttachmentBuilder } = require('discord.js');

const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPT_KEY).digest();
const IV = Buffer.alloc(16, 0);

const openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });

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

  if (userContent.toLowerCase().startsWith("imagine") || userContent.toLowerCase().startsWith("create an image") || userContent.toLowerCase().startsWith("create a image") || userContent.toLowerCase().startsWith("generate a image") || userContent.toLowerCase().startsWith("generate an image")) {

    await message.channel.sendTyping();

    try {
      const safetyCheck = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: 'Detect any NSFW content. Reply EXACTLY with: {"nsfw_content": true/false}. If you are unsure, reply with false.',
          },
          {
            role: "user",
            content: userContent,
          }
        ],
        model: "openai/gpt-oss-safeguard-20b",
     });

      const safetyCheckResult = JSON.parse(safetyCheck.choices[0]?.message?.content || '{}');

      if ( safetyCheckResult.nsfw_content ) {
        await message.reply("⚠️ Sorry, I can't generate that type of content.")
        return;
      }
    } catch (e) { 
       if ( safetyCheckResult.nsfw_content ) {
         await message.reply("⚠️ Sorry, I can't generate that type of content.")
         return;
       }
     }

    const IMAGE_API_RESULT = await fetch('https://gen.pollinations.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.IMAGE_API_KEY
      },
      body: JSON.stringify({
        prompt: userContent,
        model: 'klein',
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        response_format: 'b64_json'
      })
    })

    const IMAGE_DATA = await IMAGE_API_RESULT.json();
    
    const base64Image = IMAGE_DATA.data[0].b64_json;
    
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'image.png' });
    
    await message.channel.send({ files: [attachment] });

    return;

  }

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
    message.reply(reply);

    memory.push({ role: 'assistant', content: reply });
    await db.ai_history.set(encryptedUsername + ".history", memory);
    console.log('📁 Chat logged!');
  } catch (err) {
    console.error('❌ Error talking to Groq:', err);
    message.reply('⚠️ Sorry, I had trouble thinking. Try again later.');
  }
}

module.exports = { handleAIMessage };
