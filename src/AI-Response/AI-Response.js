// handlers/AI/AI-Response.js
const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require('openai');

const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPT_KEY).digest();
const IV = Buffer.alloc(16, 0); // Static IV (for better security, use random per user/session in future)

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

async function handleAIMessage(client, message) {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const userContent = message.content.replace(`<@${client.user.id}>`, '').trim();
  const encryptedUsername = encrypt(message.author.tag);

  console.log(`📨 Message from ${message.author.tag} (Encrypted: ${encryptedUsername}): ${userContent}`);

  try {
    await message.channel.sendTyping();

    // Load chat memory (last 5 exchanges)
    let memory = [];
    if (fs.existsSync('chatlog.txt')) {
      const logs = fs.readFileSync('chatlog.txt', 'utf-8')
        .split('\n\n')
        .slice(-5); // last 5 exchanges

      logs.forEach(log => {
        const parts = log.split('\n');
        if (parts.length === 2) {
          const userLine = parts[0].replace('[Default]: ', '');
          const aiLine = parts[1].replace('AI: ', '');
          memory.push({ role: 'user', content: userLine });
          memory.push({ role: 'assistant', content: aiLine });
        }
      });
    }

    memory.push({ role: 'user', content: userContent });

    console.log('🧠 Sending message to OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: memory,
    });

    const reply = response.choices[0].message.content;
    console.log(`🤖 OpenAI Reply: ${reply}`);
    message.reply(reply);

    // ✅ Encrypted logging
    fs.appendFileSync('chatlog.txt', `[${encryptedUsername}]: ${userContent}\nAI: ${reply}\n\n`);
    console.log('📁 Chat logged to chatlog.txt');
  } catch (err) {
    console.error('❌ Error talking to OpenAI:', err);
    message.reply('⚠️ Sorry, I had trouble thinking. Try again later.');
  }
}

module.exports = { handleAIMessage };
