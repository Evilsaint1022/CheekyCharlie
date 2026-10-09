// handlers/AI/AI-Response.js
const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require("openai");
const db = require('../Handlers/database');
const { Client, Message, AttachmentBuilder, Collector } = require('discord.js');

const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPT_KEY).digest();
const IV = Buffer.alloc(16, 0);

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

  // We no Longer use Groq
  // const GROQ_API_KEY = API_KEY;
  const OPENROUTER = process.env.OPENROUTER;

  if (!OPENROUTER) {
    console.warn('OPENROUTER Key is not set!')
    return;
  };

  const openai = new OpenAI({ apiKey: OPENROUTER, baseURL: "https://openrouter.ai/api/v1" });

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

  // ----------------------------------------------------------------
  // Checks if User Has already used the ai-response.
  const userId = message.author.id
  const usedalreadycheck = await db.lastclaim.get(`${userId}.airesponse`)

  if (usedalreadycheck === true) {
    const reply = await message.reply(`Sorry but you are already waiting for a reply.`);

    setTimeout(async () => {
      if (reply.deletable) await reply.delete();
      if (message.deletable) await message.delete();
    }, 5000)
    return;
  };
  // ----------------------------------------------------------------

  const ignoredChannels = await db.settings.get(`${message.guild.id}.ignoredAIChannels`) || [];

  if ( ignoredChannels.includes(message.channel.id) ) return;
  if ( message.channel.parent ) {
    if ( ignoredChannels.includes(message.channel.parent.id) ) return;
  }
  
  const userContent = message.content.replace(`<@${client.user.id}>`, '').trim();

  if (userContent.toLowerCase().startsWith("imagine") || userContent.toLowerCase().startsWith("create an image") || userContent.toLowerCase().startsWith("create a image") || userContent.toLowerCase().startsWith("generate a image") || userContent.toLowerCase().startsWith("generate an image")) {
    const encryptedUsername = encrypt(message.author.tag);

    await message.channel.sendTyping();
     await db.lastclaim.set(`${userId}.airesponse`, true)

    console.log(`[🧠] [CHEEKYCHARLIE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} (Encrypted: ${encryptedUsername}) Sending message to Pollinations: ${userContent}`);

    // NSFW check through the OpenRouter Decisions API (typed answer, no JSON parsing of chat output).
    // `noul` is the probability (0-1) that the answer is "true".
    try {
      const decisionResponse = await fetch("https://openrouter.ai/api/alpha/decisions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "inception/mercury-decide",
          state: userContent,
          questions: {
            nsfw_content: {
              type: "noul",
              instructions: "Does this image-generation prompt request NSFW content (nudity, sexual content, explicit gore)? If you are unsure, answer false.",
              criteria: {
                true: "Requests nudity, sexual content, or explicit gore",
                false: "Safe, or unclear"
              }
            }
          }
        })
      });

      if (!decisionResponse.ok) throw new Error(`Decisions API returned HTTP ${decisionResponse.status}`);

      const { answers } = await decisionResponse.json();
      const nsfwProbability = answers.nsfw_content.noul;

      if (nsfwProbability > 0.5) {
        await db.lastclaim.set(`${userId}.airesponse`, false)
        await message.reply("⚠️ Sorry, I can't generate that type of content.")
        console.log(`[🛡️] [CHEEKYCHARLIE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} (Encrypted: ${encryptedUsername}) Query Has Failed The Safety Check (nsfw: ${nsfwProbability.toFixed(4)})`);
        return;
      }

      console.log(`[🛡️] [CHEEKYCHARLIE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} (Encrypted: ${encryptedUsername}) Query Has Passed The Safety Check (nsfw: ${nsfwProbability.toFixed(4)})`);
    } catch (error) {
      // Fail closed: if the check can't run, don't generate the image.
      console.error('❌ Error running the NSFW safety check:', error);
      await db.lastclaim.set(`${userId}.airesponse`, false)
      await message.reply("⚠️ Sorry, I couldn't verify that prompt right now. Try again later.")
      return;
    }

    const IMAGE_API_KEY = process.env.IMAGE_API_KEY;

    if (!IMAGE_API_KEY) {
      console.warn('🟥・The IMAGE_API_KEY Token is not set.')
      return;
    };

    const IMAGE_API_RESULT = await fetch('https://gen.pollinations.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + IMAGE_API_KEY
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

    // Sets the lastclaim to false so that the user can use the ai-response again.
    await db.lastclaim.set(`${userId}.airesponse`, false)

    await message.channel.send({ files: [attachment] });

    console.log(`[🧠] [CHEEKYCHARLIE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} (Encrypted: ${encryptedUsername}) Pollination's Replied with a image in ${message.channel.name} ${message.channel.id}`);

    return;

  }

  const encryptedUsername = encrypt(message.author.tag);

  try {
    await message.channel.sendTyping();
    await db.lastclaim.set(`${userId}.airesponse`, true)

    let memory = [];
    const chatlog = await db.ai_history.get(encryptedUsername + ".history");

    if (chatlog && Array.isArray(chatlog)) {
      if (chatlog.length > 22) {
          chatlog = chatlog.slice(-20);
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

    console.log(`[🧠] [CHEEKYCHARLIE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} (Encrypted: ${encryptedUsername}) Sending message to OPENROUTER: ${userContent}`);
    const response = await openai.chat.completions.create({

      messages: [
        ...memory,
        { role: 'system', content: systemPrompt },
      ],
      model: "aion-labs/aion-3.5-mini"

    });

    const reply = response.choices[0].message.content;

    let memoryreply = reply;
    
    const escapedUsername = message.author.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const usernameRegex = new RegExp(escapedUsername, 'gi');

    if (usernameRegex.test(memoryreply)) {
        const encryptedUsername = encrypt(message.author.tag);

        memoryreply = memoryreply.replace(
            usernameRegex, encryptedUsername
        );
    }

    console.log(`[🧠] [CHEEKYCHARLIE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} (Encrypted: ${encryptedUsername}) OPENROUTER Response: ${reply}`);

    // Sets the lastclaim to false so that the user can use the ai-response again.
    await db.lastclaim.set(`${userId}.airesponse`, false)

    message.reply(reply);
    
    memory.push({ role: 'assistant', content: memoryreply });
    await db.ai_history.set(encryptedUsername + ".history", memory);
    console.log(`[📁] [CHEEKYCHARLIE] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag} (Encrypted: ${encryptedUsername}) Conversation has been successfully logged!`);
    
  } catch (error) {
    console.error('❌ Error talking to OPENROUTER:', error);
    db.lastclaim.set(`${userId}.airesponse`, false)
    message.reply('⚠️ Sorry, I had trouble thinking. Try again later.');
  }
}

module.exports = { handleAIMessage };
