// events/welcome_reaction.js

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if the message contains the word "welcome" (case-insensitive)
        if (message.content.toLowerCase().includes('welcome')) {
            try {
                // Wait 3 seconds before reacting
                await new Promise(resolve => setTimeout(resolve, 3000));

                // React with the custom emoji
                await message.react('❤️');
            } catch (error) {
                console.error('Failed to add reaction:', error);
            }
        }
    },
};
