const { Client, GatewayIntentBits } = require('discord.js');

module.exports = {
    name: 'messageCreate', // Event name to listen for new messages
    once: false, // Set to false to allow multiple messages to trigger this event
    async execute(message) {
        // Check if the message content contains the word "shrimp" (case-insensitive)
        if (message.content.toLowerCase().includes('shrimp')) {
            if (message.author.bot) return; // Don't let the bot react to its own messages
            
            try {
                // React with the shrimp emoji 🦐
                await message.react('🦐');
            } catch (error) {
                console.error('Failed to react with shrimp emoji:', error);
            }
        }
    },
};
