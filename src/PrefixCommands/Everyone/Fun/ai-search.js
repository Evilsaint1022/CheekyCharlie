// ai-search.js (PREFIX VERSION)
require('dotenv').config({ quiet: true });
const OpenAI = require("openai");
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute

module.exports = {
  name: 'ai-search',
  aliases: ['aisearch', 'ai'],

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

  // -----------------------------------------------------
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.warn('🟥・The OPENAI_API_KEY is not set.')
      return;
    };

    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
    // -----------------------------------------------------
    const OPENROUTER = process.env.OPENROUTER;
      if (!OPENROUTER) {
        console.warn('🟥・OPENROUTER Key is not set!')
        return;
      };
    
    const checker = new OpenAI({apiKey: OPENROUTER, baseURL: "https://openrouter.ai/api/v1" });
    // -----------------------------------------------------

    const query = args.join(' ');
    if (!query) {
      return message.reply('❌ You must provide something to search for.');
    }

    const { guild, author, channel } = message;

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

    console.log(
      `[🌿] [AI-SEARCH] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${guild.name} ${guild.id} ${author.username} used the ai-search command to search "${query}".`
    );

    // Set cooldown
    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    try {
      const safetyCheck = await checker.chat.completions.create({
        messages: [
          {
            role: "system",
            content: 'Detect any NSFW content. Reply EXACTLY with: {"nsfw_content": true/false}. If you are unsure, reply with false.',
          },
          {
            role: "user",
            content: query,
          }
        ],
        model: "openai/gpt-oss-safeguard-20b",
     });

      const safetyCheckResult = JSON.parse(safetyCheck.choices[0]?.message?.content || '{}');

      if ( safetyCheckResult.nsfw_content ) {
        await message.reply("⚠️ Sorry, I can't search for that type of content.")
        console.log(`[🛡️] [AI-SEARCH] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag}'s Query Has Failed The Saftey Check`);
        return;
      }
    } catch (err) { 
       if ( safetyCheckResult.nsfw_content ) {
        console.log(`[🛡️] [AI-SEARCH] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.author.tag}'s Query Has Failed The Saftey Check`);
         await message.reply("⚠️ Sorry, I can't search for that type of content.")
         return;
       }
     }

    console.log(`[🛡️] [AI-SEARCH] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] Passed The Saftey Checks`);

    // ⏳ Processing message
    const loadingMsg = await message.reply('🔍 Searching with AI, please wait...');

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that searches and summarizes relevant results clearly wtih sweet short answers.'
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

      console.log(
      `[🌿] [AI-SEARCH] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${guild.name} ${guild.id} ${author.username} got the reply in ${channel.name} ${channel.id}`
    );

    } catch (err) {
      console.error(err);
      await loadingMsg.edit('❌ There was an error fetching AI results.');
    }
  }
};
