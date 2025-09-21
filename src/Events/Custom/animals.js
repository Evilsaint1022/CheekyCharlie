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
    crab: '🦀'
};

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        const lowerContent = message.content.toLowerCase();

        // Check each animal name in the map
        for (const [animal, emoji] of Object.entries(animalEmojiMap)) {
            if (lowerContent.includes(animal)) {
                try {
                    await message.react(emoji);
                } catch (err) {
                    console.error(`Failed to react with ${emoji} to message:`, err);
                }
            }
        }
    },
};
