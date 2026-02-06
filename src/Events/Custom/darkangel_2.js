module.exports = {
    name: 'messageCreate',

    async execute(message) {
        // Ignore bot messages
       if (message.author.bot) return;
       if (message.webhookId) return;
       if (message.content.includes(':')) return;

        const content = message.content.toLowerCase();

    try {

        // 🔍 Re-fetch the message to ensure it still exists
        const fetchedMessage = await message.channel.messages.fetch(message.id).catch(() => null);
        if (!fetchedMessage) return; // Message was deleted

        const matches = ["eclipse", "Eclipse"]

        if ( matches.includes(content) ) {

            console.log(`[👩🏻] [DARK ANGEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Eclipse found in ${message.channel.name} ${message.channel.id}`);
            await message.reply({ content: "Eclipse the best!" })
        }
            } catch (error) {
            // Ignore Error: Unknown Emoji
            if (err.code !== 10014) return;
            if (err.code !== 30010) return;
            if (err.code !== 98881) return;
          console.error('Failed to send message:', error);
        }
    }
};
