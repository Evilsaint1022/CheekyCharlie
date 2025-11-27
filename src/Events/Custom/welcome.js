// events/welcome_reaction.js

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {

        const MAX_REACTIONS = 20;
        let reactionCount = 0;

        // Ignore bot messages
        if (message.author.bot) return;

        // Check if the message contains the word "welcome" (case-insensitive)
        if (message.content.toLowerCase().includes('welcome')) {

        // Check if the message has already reached the maximum number of reactions
        if (reactionCount >= MAX_REACTIONS) return; // Stop if limit reached

        try {
            // Wait 3 seconds before reacting
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log(`[❤️] [WELCOME REACTION] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Welcome Reaction in ${message.channel.name} ${message.channel.id}`);
            
            // React with the custom emoji
            await message.react('❤️');
            reactionCount++;
            } catch (error) {
            // Ignore Error: Unknown Emoji
            if (err.code !== 10014) return;
            if (err.code !== 30010) return;
            if (err.code !== 98881) return;
            console.error('Failed to add reaction:', error);
            }
        }
    },
};
