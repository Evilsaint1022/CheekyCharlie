// ai-search.js (PREFIX VERSION)
require('dotenv').config({ quiet: true });
const OpenAI = require('openai');
const db = require('../../../Handlers/database');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const COOLDOWN_TIME = 60 * 1000; // 1 minute

module.exports = {
  name: 'ai-search',
  aliases: ['aisearch', 'ai'],

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const query = args.join(' ');
    if (!query) {
      return message.reply('❌ You must provide something to search for.');
    }

    const { guild, author, channel } = message;

    console.log(
      `[🌿] [AI-SEARCH] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${guild.name} ${guild.id} ${author.username} used the ai-search command.`
    );

    const GLOBAL_COOLDOWN_KEY = `${guild.id}.ai_search_global`;

    // 🌐 GLOBAL COOLDOWN CHECK
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      return message.reply(
        `⏳ The ai-search command is on global cooldown. Please wait ${remaining} more seconds.`
      );
    }

    // Set cooldown
    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    // ⏳ Processing message
    const loadingMsg = await message.reply('🔍 Searching with AI, please wait...');

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that searches and summarizes relevant results clearly.'
          },
          { role: 'user', content: query }
        ],
        max_tokens: 500
      });

      const reply = completion.choices[0].message.content.trim();

      // Split into 2000-character chunks
      const chunks = reply.match(/[\s\S]{1,2000}(?=$|\n)/g) || [];

      if (chunks.length === 0) {
        return loadingMsg.edit('❌ No results found.');
      }

      // Edit the loading message with first chunk
      await loadingMsg.edit(chunks[0]);

      // Send remaining chunks
      for (let i = 1; i < chunks.length; i++) {
        await channel.send(chunks[i]);
      }

    } catch (err) {
      console.error(err);
      await loadingMsg.edit('❌ There was an error fetching AI results.');
    }
  }
};
