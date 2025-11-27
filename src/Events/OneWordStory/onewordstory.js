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
        const guildKey = `${guild.name}_${guild.id}`;
        const currentChannelId = message.channel.id;

        const storyChannel = await db.settings.get(guildKey + ".story_channel");

        if (!storyChannel || currentChannelId !== storyChannel) return;

        const CORRECT_EMOJI = "✅";

        const currentStory = await db.onewordstory.get(guildKey + ".story") || [];

        const newWord = message.content.trim();

        if ( newWord.includes(" ") ) {

            await message.delete();
            const errorMSG = await message.channel.send("Please send only one word at a time.");

            setTimeout(() => {
                errorMSG.delete();
            }, 2000);

            return;

        }

        if ( newWord.length < 1 ) {

            await message.delete();
            const errorMSG = await message.channel.send("Please send a valid word.");

            setTimeout(() => {
                errorMSG.delete();
            }, 2000);

            return;

        }

        const lastAuthor = await db.onewordstory.get(guildKey + ".lastAuthor") || null;

        if ( lastAuthor && lastAuthor === message.author.id ) {

            await message.delete();
            const errorMSG = await message.channel.send("You cannot add two words in a row.");

            setTimeout(() => {
                errorMSG.delete();
            }, 2000);

            return;

        }

        currentStory.push(newWord);

        if ([".", "?", "!"].includes(message.content.trim())) {

            function joinStory(words) {
            let story = "";
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                if ([",", ".", "?", "!", ";", ":", "(", ")", "[", "]", "{", "}", "\"", "'", "..."].includes(word)) {
                story += word;
                } else {
                if (story.length > 0) story += " ";
                story += word;
                }
            }
            return story;
            }

            const fullStory = joinStory(currentStory);
            await message.channel.send(`Story so far!\n${fullStory}`);

        }

        console.log(`[] [ONE-WORD-STORY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${message.author.username} added the word ${newWord} to the One Word Story!`);

        await db.onewordstory.set(guildKey + ".story", currentStory);
        await db.onewordstory.set(guildKey + ".lastAuthor", message.author.id);

        await message.react(CORRECT_EMOJI);

    }
};
