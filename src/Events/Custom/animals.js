// events/messageCreate/animalReacts.js
const { Events } = require('discord.js');

// Map animal names to Discord default emojis
const animalEmojiMap = {
    cat: '🐱',
    dog: '🐶',
    mouse: '🐭',
    hamster: '🐹',
    rabbit: '🐰',
    fox: '🦊',
    bear: '🐻',
    panda: '🐼',
    koala: '🐨',
    tiger: '🐯',
    lion: '🦁',
    cow: '🐮',
    pig: '🐷',
    frog: '🐸',
    monkey: '🐵',
    chicken: '🐔',
    penguin: '🐧',
    bird: '🐦',
    wolf: '🐺',
    horse: '🐴',
    unicorn: '🦄',
    elephant: '🐘',
    snake: '🐍',
    turtle: '🐢',
    fish: '🐟',
    dolphin: '🐬',
    whale: '🐳',
    shark: '🦈',
    octopus: '🐙',
    crab: '🦀',
    spider: '🕷️'
};

// Max reactions per message
const MAX_REACTIONS = 20;

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
                // Ignore Error: Unknown Emoji
                if (err.code !== 10014) return;
                if (err.code !== 30010) return;
                if (err.code !== 98881) return;
                console.error(`Failed to react with ${emoji} to message:`, err);
                }
            }
        }
    },
};
