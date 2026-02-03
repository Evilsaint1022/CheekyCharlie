const db = require('../../../Handlers/database');

module.exports = {
    name: 'view-one-word-story',
    aliases: ['viewstory', 'onewordstory', 'story'],

    async execute(message) {

        if (!message.guild) {
            return message.reply('This command cannot be used in DMs.');
        }

        console.log(
            `[🌿] [VIEW-ONE-WORD-STORY] ` +
            `[${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
            `${message.author.username} used the view-one-word-story command.`
        );

        const guildKey = message.guild.id;
        const storyArray = await db.onewordstory.get(guildKey + '.story') || [];

        if (storyArray.length === 0) {
            return message.reply('The one-word story is currently empty.');
        }

        // Join words safely
        function joinStory(words) {
            let result = "";

            for (const word of words) {
                if ([",", ".", "?", "!", ";", ":", "(", ")", "[", "]", "{", "}", "\"", "'", "..."].includes(word)) {
                    result += word;
                } else {
                    if (result.length > 0) result += " ";
                    result += word;
                }
            }

            return result;
        }

        // HARD SAFE splitter (character-based)
        function splitByLength(text, maxLength) {
            const chunks = [];
            let start = 0;

            while (start < text.length) {
                chunks.push(text.slice(start, start + maxLength));
                start += maxLength;
            }

            return chunks;
        }

        const storyText = joinStory(storyArray);

        const HEADER = '**Current One-Word Story:**\n\n';
        const FOOTER_TEMPLATE = '\n\n*Part X/Y*';

        // Worst-case footer size (Part 99/99)
        const MAX_FOOTER_LENGTH = FOOTER_TEMPLATE.replace('X', '99').replace('Y', '99').length;

        // True safe space for story text
        const SAFE_LENGTH = 2000 - HEADER.length - MAX_FOOTER_LENGTH;

        const chunks = splitByLength(storyText, SAFE_LENGTH);

        for (let i = 0; i < chunks.length; i++) {
            const footer = chunks.length > 1
                ? `\n\n*Part ${i + 1}/${chunks.length}*`
                : '';

            const messageContent = HEADER + chunks[i];

            if (i === 0) {
                // First message replies to the user
                await message.reply(messageContent);

            } else {

                let messageContent = chunks[i] + footer;

                // Remaining messages just send normally
                await message.channel.send(messageContent);
            }
        }
    }
};
