// events/messageCreate/animalReacts.js
const { Events, PermissionFlagsBits } = require('discord.js');

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
       if (message.webhookId) return;
       if (message.content.includes(':')) return;

        const permissions = message.channel.permissionsFor(message.guild.members.me);

        if (!permissions?.has(PermissionFlagsBits.AddReactions)) {
            return;
        }

        const words = message.content.toLowerCase().split(/\s+/);
        let reactionCount = 0;

        // Check each animal name in the map
        for (const [animal, emoji] of Object.entries(animalEmojiMap)) {
            if (reactionCount >= MAX_REACTIONS) break; // Stop if limit reached
            if (words.includes(animal.toLowerCase())) {

        try {

        // 🔍 Re-fetch the message to ensure it still exists
        const fetchedMessage = await message.channel.messages.fetch(message.id).catch(() => null);
        if (!fetchedMessage) return; // Message was deleted

        await message.react(emoji);
        reactionCount++;
        console.log(`[${emoji}] [ANIMAL REACTIONS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Reacted with ${emoji} ${animal} in ${message.channel.name} ${message.channel.id}`);

                } catch (error) {
                // Ignore Error: Unknown Emoji
                if (error.code === 10014) return;
                if (error.code === 30010) return;
                if (error.code === 98881) return;
                console.error(`Failed to react with ${emoji} to message:`, error);
                }
            }
        }
    },
};
