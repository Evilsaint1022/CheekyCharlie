const { Events, Message } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    name: Events.MessageCreate,

    /**
     * @param {Message} message
     */
    async execute(message) {

        if (message.author.bot || !message.guild) return;

        const guild = message.guild;
        const guildKey = guild.id;
        const currentChannelId = message.channel.id;

        const storyChannel = await db.settings.get(guildKey + ".story_channel");
        if (!storyChannel || currentChannelId !== storyChannel) return;

        const CORRECT_EMOJI = "✅";

        const currentStory = await db.onewordstory.get(guildKey + ".story") || [];
        const newWord = message.content.trim();

        // ❌ No spaces allowed
        if (newWord.includes(" ")) {
            await message.delete();
            const errorMSG = await message.channel.send("Please send only one word at a time.");
            setTimeout(() => errorMSG.delete(), 2000);
            return;
        }

        // ❌ Empty input
        if (newWord.length < 1) {
            await message.delete();
            const errorMSG = await message.channel.send("Please send a valid word.");
            setTimeout(() => errorMSG.delete(), 2000);
            return;
        }

        // ❌ Same author twice
        const lastAuthor = await db.onewordstory.get(guildKey + ".lastAuthor") || null;
        if (lastAuthor && lastAuthor === message.author.id) {
            await message.delete();
            const errorMSG = await message.channel.send("You cannot add two words in a row.");
            setTimeout(() => errorMSG.delete(), 2000);
            return;
        }

        currentStory.push(newWord);

        // Join words into a readable story
        function joinStory(words) {
            let story = "";
            for (const word of words) {
                if ([",", ".", "?", "!", ";", ":", "(", ")", "[", "]", "{", "}", "\"", "'", "..."].includes(word)) {
                    story += word;
                } else {
                    if (story.length > 0) story += " ";
                    story += word;
                }
            }
            return story;
        }

        // HARD safe splitter (character-based)
        function splitByLength(text, maxLength) {
            const chunks = [];
            let index = 0;

            while (index < text.length) {
                chunks.push(text.slice(index, index + maxLength));
                index += maxLength;
            }

            return chunks;
        }

        // When punctuation ends a sentence, show the story so far
        if ([".", "?", "!"].includes(newWord)) {

            const fullStory = joinStory(currentStory);

            const HEADER = '**Story so far:**\n\n';
            const FOOTER_TEMPLATE = '\n\n*Part X/Y*';
            const MAX_FOOTER_LENGTH = FOOTER_TEMPLATE.replace('X', '99').replace('Y', '99').length;

            const SAFE_LENGTH = 2000 - HEADER.length - MAX_FOOTER_LENGTH;
            const chunks = splitByLength(fullStory, SAFE_LENGTH);

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

        console.log(
            `[🗨️] [ONE-WORD-STORY] ` +
            `[${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
            `${guild.name} ${guild.id} ${message.author.username} added the word "${newWord}"`
        );

        await db.onewordstory.set(guildKey + ".story", currentStory);
        await db.onewordstory.set(guildKey + ".lastAuthor", message.author.id);

        await message.react(CORRECT_EMOJI);
    }
};
