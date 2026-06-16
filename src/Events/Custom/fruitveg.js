const { Events } = require('discord.js');

// Map produce names to Discord default emojis
const produceEmojiMap = {
    apple: '🍎',
    banana: '🍌',
    orange: '🍊',
    grape: '🍇',
    strawberry: '🍓',
    watermelon: '🍉',
    pineapple: '🍍',
    peach: '🍑',
    lemon: '🍋',
    avocado: '🥑',
    tomato: '🍅',
    carrot: '🥕',
    corn: '🌽',
    potato: '🥔',
    broccoli: '🥦',
    lettuce: '🥬',
    cucumber: '🥒',
    onion: '🧅',
    garlic: '🧄',
    pepper: '🫑'
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

        const words = message.content.toLowerCase().split(/\s+/);
        let reactionCount = 0;

        // Check each produce name in the map
        for (const [produce, emoji] of Object.entries(produceEmojiMap)) {
            if (reactionCount >= MAX_REACTIONS) break;

            if (words.includes(produce.toLowerCase())) {
                try {
                    // 🔍 Re-fetch the message to ensure it still exists
                    const fetchedMessage = await message.channel.messages
                        .fetch(message.id)
                        .catch(() => null);

                    if (!fetchedMessage) return; // Message was deleted

                    await fetchedMessage.react(emoji);

                    reactionCount++;

                    console.log(
                        `[${emoji}] [FRUIT & VEGGIES] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message.guild.name} ${message.guild.id} - Reacted with ${emoji} ${produce} in ${message.channel.name} ${message.channel.id}`
                    );

                } catch (error) {
                // Ignore Error: Unknown Emoji
                if (error.code !== 10014) return;
                if (error.code !== 30010) return;
                if (error.code !== 98881) return;
                console.error(`Failed to react with ${emoji} to message:`, error);
                }
            }
        }
    },
};