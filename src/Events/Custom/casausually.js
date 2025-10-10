// events/messageCreate/animalReacts.js
const { Events } = require('discord.js');

const pony = `<:trixy:1420580281831657502>`;
const MAX_REACTIONS = 20;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return; // Ignore bot messages

        const lowerContent = message.content.toLowerCase();
        let reactionCount = 0;

        if (reactionCount < MAX_REACTIONS && lowerContent.includes('pony')) {
            try {
                await message.react(pony);
                reactionCount++;
            } catch (err) {
                 // Ignore Error: Unknown Emoji
                    if (err.code !== 10014) return;
                    if (err.code !== 10014) return;
                    if (err.code !== 30010) return;
                    if (err.code !== 98881) return;
                console.error(`Failed to react with ${pony} to message:`, err);
            }
        }
    },
};
