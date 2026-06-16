const { Events, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    once: false, // Set to false to allow multiple messages to trigger this event
    async execute(message) {

        if (message.author.bot) return;
        if (message.webhookId) return;
        if (message.content.includes(':')) return;

        const permissions = message.channel.permissionsFor(message.guild.members.me);

        if (!permissions?.has(PermissionFlagsBits.AddReactions)) {
            return;
        }

        const MAX_REACTIONS = 20;
        let reactionCount = 0;

        // Check if the message content contains the word "shrimp" (case-insensitive)
        if (message.content.toLowerCase().includes('shrimp')) {
        
        try {

        // 🔍 Re-fetch the message to ensure it still exists
        const fetchedMessage = await message.channel.messages.fetch(message.id).catch(() => null);
        if (!fetchedMessage) return; // Message was deleted

        if (reactionCount >= MAX_REACTIONS) return; // Stop if limit reached 

                // React with the shrimp emoji 🦐
                console.log(`[🦐] [SHRIMP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Shrimp Reaction in ${message.channel.name} ${message.channel.id}`)
                await message.react('🦐');
                reactionCount++;

            } catch (error) {
            // Ignore Error: Unknown Emoji
            if (error.code === 10014) return;
            if (error.code === 30010) return;
            if (error.code === 98881) return;
            console.error('Failed to react with shrimp emoji:', error);
            }
        }
    },
};
