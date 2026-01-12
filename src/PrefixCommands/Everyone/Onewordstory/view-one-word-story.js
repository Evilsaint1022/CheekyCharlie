const db = require('../../../Handlers/database'); // Import the database module

module.exports = {
    name: 'view-one-word-story',
    aliases: ['viewstory', 'onewordstory', 'story'],

    async execute(message, args) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply('This command cannot be used in DMs.');
        }

        console.log(
            `[🌿] [VIEW-ONE-WORD-STORY] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
            `${message.guild.name} ${message.guild.id} ${message.author.username} used the view-one-word-story command.`
        );

        const guild = message.guild;
        const guildKey = `${guild.id}`;

        const currentStory = await db.onewordstory.get(guildKey + '.story') || [];

        function joinStory(words) {
            let story = "";
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                if (
                    [",", ".", "?", "!", ";", ":", "(", ")", "[", "]", "{", "}", "\"", "'", "..."]
                        .includes(word)
                ) {
                    story += word;
                } else {
                    if (story.length > 0) story += " ";
                    story += word;
                }
            }
            return story;
        }

        if (currentStory.length === 0) {
            return message.reply('The one-word story is currently empty.');
        }

        const storyText = joinStory(currentStory);

        return message.reply(
            `**Current One-Word Story:**\n\n${storyText}`
        );
    }
};
