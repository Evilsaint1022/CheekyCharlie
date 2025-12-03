module.exports = {
    name: 'messageCreate',

    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        const content = message.content.toLowerCase();

        const matches = ["eclipse", "Eclipse"]

        if ( matches.includes(content) ) {

            console.log(`[👩🏻] [DARK ANGEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Eclipse found in ${message.channel.name} ${message.channel.id}`);
            await message.reply({ content: "Eclipse the best!" })

        }
    }
};
