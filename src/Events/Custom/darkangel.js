module.exports = {
    name: 'messageCreate',

    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        const content = message.content.toLowerCase();

        const matches = ["angel", "dark angel"]

        if ( matches.includes(content) ) {

            console.log(`[👩🏻] [DARK ANGEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Dark Angel found in ${message.channel.name} ${message.channel.id}`);
            await message.reply({ content: "Angel the best!" })

        }
    }
};
