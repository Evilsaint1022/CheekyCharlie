// ai-search.js
const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config({ quiet: true });
const OpenAI = require('openai');
const db = require('../../../Handlers/database'); // make sure this is correct path

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const GLOBAL_COOLDOWN_KEY = 'ai_search_global';
const COOLDOWN_TIME = 60 * 1000; // 1 minute

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-search')
    .setDescription('Search for results using AI.')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('What do you want to search for?')
        .setRequired(true)
    ),
    
  async execute(interaction) {
    console.log(`[🌿] [AI-SEARCH] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${interaction.guild.name} ${interaction.guild.id} ${interaction.user.username} used the ai-search command.`);
    const query = interaction.options.getString('query');

    // 🌐 GLOBAL COOLDOWN CHECK
        const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
        const now = Date.now();

        if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
            const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
            return interaction.reply({ content: `⏳ The /ai-search command is on global cooldown. Please wait ${remaining} more seconds.`, flags: 64 });
        }

        // Set the global cooldown
        await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    await interaction.deferReply();

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI assistant that searches and summarizes relevant results clearly.' },
          { role: 'user', content: query }
        ],
        max_tokens: 500
      });

      const reply = completion.choices[0].message.content.trim();

      // Split into chunks of 2000 characters
      const chunks = reply.match(/[\s\S]{1,2000}(?=$|\n)/g);

      // First chunk replaces the deferred reply
      await interaction.editReply(chunks[0]);

      // Remaining chunks are sent as follow-ups
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp(chunks[i]);
      }

    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ There was an error fetching AI results.');
    }
  }
};
