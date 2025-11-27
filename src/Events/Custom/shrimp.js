const { Client, GatewayIntentBits } = require('discord.js');

module.exports = {
    name: 'messageCreate', // Event name to listen for new messages
    once: false, // Set to false to allow multiple messages to trigger this event
    async execute(message) {

        const MAX_REACTIONS = 20;
        let reactionCount = 0;

        // Check if the message content contains the word "shrimp" (case-insensitive)
        if (message.content.toLowerCase().includes('shrimp')) {
        if (message.author.bot) return; // Don't let the bot react to its own messages

        if (reactionCount >= MAX_REACTIONS) return; // Stop if limit reached 
            
            try {
                // React with the shrimp emoji 🦐
                console.log(`[🦐] [SHRIMP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Shrimp Reaction in ${message.channel.name} ${message.channel.id}`)
                await message.react('🦐');
            } catch (error) {
            // Ignore Error: Unknown Emoji
            if (err.code !== 10014) return;
            if (err.code !== 30010) return;
            if (err.code !== 98881) return;
            console.error('Failed to react with shrimp emoji:', error);
            }
        }
    },
};
