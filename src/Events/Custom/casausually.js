// events/messageCreate/animalReacts.js
const { Events } = require('discord.js');

const pony = `<:trixy:1420580281831657502>`;
const MAX_REACTIONS = 20;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
       if (message.author.bot) return;
       if (message.webhookId) return;

        const lowerContent = message.content.toLowerCase();
        let reactionCount = 0;

        if (reactionCount < MAX_REACTIONS && lowerContent.includes('pony')) {

    try {
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 🔍 Re-fetch the message to ensure it still exists
        const fetchedMessage = await message.channel.messages.fetch(message.id).catch(() => null);
        if (!fetchedMessage) return; // Message was deleted

                await message.react(pony);
                reactionCount++;
            } catch (error) {
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
