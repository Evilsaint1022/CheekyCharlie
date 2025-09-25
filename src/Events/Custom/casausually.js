// events/messageCreate/animalReacts.js
const { Events } = require('discord.js');

// Map animal names to Discord default emojis
const animalEmojiMap = {
    pony: `<:trixy:1420580281831657502>`,
};

// Max reactions per message
const MAX_REACTIONS = 20;

if (!animalEmojiMap) return;
console.log(`animalEmojiMap does not exist`);

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        const lowerContent = message.content.toLowerCase();
        let reactionCount = 0;

        // Check each animal name in the map
        for (const [animal, emoji] of Object.entries(animalEmojiMap)) {
            if (reactionCount >= MAX_REACTIONS) break; // Stop if limit reached
            if (lowerContent.includes(animal)) {
                try {
                    await message.react(emoji);
                    reactionCount++;
                } catch (err) {
                    console.error(`Failed to react with ${emoji} to message:`, err);
                }
            }
        }
    },
};
