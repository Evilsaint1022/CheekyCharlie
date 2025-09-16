module.exports = {
    name: 'messageCreate',

    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        const content = message.content.toLowerCase();

        const matches = ["angel", "dark angel"]

        if ( matches.includes(content) ) {

            await message.reply({ content: "Angel the best!" })

        }
    }
};
