const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'hug',
    description: 'Hug another member with a random GIF!',
    async execute(message, args) {
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
        const sender = message.author;
        const senderName = sender.username;
        const guild = message.guild;

        if (!target) {
            return message.reply("You need to mention someone or provide a valid user ID to hug!");
        }

        if (target.id === sender.id) {
            return message.reply("You can't hug yourself... but here's a virtual hug from me! 🤗");
        }

        const targetName = target.username;
        const tenorKey = process.env.TENORKEY;
        const huggifslist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+hug&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
                randomGif = randomResult.media_formats.gif.url;

                const savedGifs = await db.huggifs.get(huggifslist) || {};

                if (!Object.values(savedGifs).includes(randomGif)) {
                    const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                    await db.huggifs.set(`${huggifslist}.${newKey}`, randomGif);
                }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        // Fallback to saved GIFs if Tenor fails
        if (!randomGif) {
            const savedGifs = await db.huggifs.get(huggifslist) || {};
            const gifValues = Object.values(savedGifs);
            if (gifValues.length > 0) {
                randomGif = gifValues[Math.floor(Math.random() * gifValues.length)];
            }
        }

        if (!randomGif) {
            return message.reply("No hug GIFs available right now 😞 Try again later.");
        }

        // Update hug counter
        let currentHugs = await db.fun_counters.get(`${target.id}.hugs`);
        if (typeof currentHugs !== 'number') currentHugs = 0;
        currentHugs++;
        await db.fun_counters.set(`${target.id}.hugs`, currentHugs);

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just hugged <@${target.id}>!\n-# <@${target.id}> has been hugged a total of ${currentHugs} times.`)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('hug_back')
                .setLabel('🔁 Hug Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[🫂] [HUG] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${senderName} hugged ${targetName}`);

        const reply = await message.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can hug back!", flags: 64 });
            }

            let hugBackGif = null;
            try {
                const hugBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+hug&key=${tenorKey}&limit=20`);
                const hugBackData = await hugBackResponse.json();

                if (hugBackData.results && hugBackData.results.length > 0) {
                    const randomResult = hugBackData.results[Math.floor(Math.random() * hugBackData.results.length)];
                    hugBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = await db.huggifs.get(huggifslist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(hugBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                        await db.huggifs.set(`${huggifslist}.${newKey}`, hugBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch hugback from Tenor:", err);
            }

            // ✅ Fallback for hugback
            if (!hugBackGif) {
                const savedGifs = await db.huggifs.get(huggifslist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    hugBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!hugBackGif) {
                return btnInteraction.reply({ content: "No hug GIFs available right now 😞", flags: 64 });
            }

            // Update hug counter for the original sender
            let senderHugs = await db.fun_counters.get(`${sender.id}.hugs`);
            if (typeof senderHugs !== 'number') senderHugs = 0;
            senderHugs++;
            await db.fun_counters.set(`${sender.id}.hugs`, senderHugs);

            console.log(`[🫂] [HUG] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${targetName} hugged ${senderName}`);

            const hugBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> hugged <@${sender.id}> back!\n-# <@${sender.id}> has been hugged a total of ${senderHugs} times.`)
                .setImage(hugBackGif)
                .setTimestamp();

            await btnInteraction.reply({ embeds: [hugBackEmbed] });
            collector.stop();
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('hug_back_disabled')
                    .setLabel('🔁 Hug Back!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
