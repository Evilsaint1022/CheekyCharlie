const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'tickle',
    description: 'Tickle another member with a random GIF!',
    async execute(message, args) {
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
        const sender = message.author;
        const senderName = sender.username;
        const guild = message.guild;

        if (!target) {
            return message.reply("You need to mention someone or provide a valid user ID to tickle!");
        }

        if (target.id === sender.id) {
            return message.reply("You can't tickle yourself... that's just impossible! 😂");
        }

        const targetName = target.username;
        const tenorKey = process.env.TENORKEY;
        const ticklegifslist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+tickle&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
                randomGif = randomResult.media_formats.gif.url;

                const savedGifs = await db.ticklegifs.get(ticklegifslist) || {};

                if (!Object.values(savedGifs).includes(randomGif)) {
                    const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                    await db.ticklegifs.set(`${ticklegifslist}.${newKey}`, randomGif);
                }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        // Fallback to saved GIFs if Tenor fails
        if (!randomGif) {
            const savedGifs = await db.ticklegifs.get(ticklegifslist) || {};
            const gifValues = Object.values(savedGifs);
            if (gifValues.length > 0) {
                randomGif = gifValues[Math.floor(Math.random() * gifValues.length)];
            }
        }

        if (!randomGif) {
            return message.reply("No tickle GIFs available right now 😞 Try again later.");
        }

        // Update tickle counter
        let currentTickles = await db.fun_counters.get(`${target.id}.tickles`);
        if (typeof currentTickles !== 'number') currentTickles = 0;
        currentTickles++;
        await db.fun_counters.set(`${target.id}.tickles`, currentTickles);

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just tickled <@${target.id}>!\n-# <@${target.id}> has been tickled a total of ${currentTickles} times.`)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tickle_back')
                .setLabel('🔁 Tickle Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[🤣] [TICKLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${senderName} tickled ${targetName}`);

        const reply = await message.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can tickle back!", flags: 64 });
            }

            let tickleBackGif = null;
            try {
                const tickleBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+tickle&key=${tenorKey}&limit=20`);
                const tickleBackData = await tickleBackResponse.json();

                if (tickleBackData.results && tickleBackData.results.length > 0) {
                    const randomResult = tickleBackData.results[Math.floor(Math.random() * tickleBackData.results.length)];
                    tickleBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = await db.ticklegifs.get(ticklegifslist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(tickleBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                        await db.ticklegifs.set(`${ticklegifslist}.${newKey}`, tickleBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch tickleback from Tenor:", err);
            }

            // ✅ Fallback for tickleback
            if (!tickleBackGif) {
                const savedGifs = await db.ticklegifs.get(ticklegifslist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    tickleBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!tickleBackGif) {
                return btnInteraction.reply({ content: "No tickle GIFs available right now 😞", flags: 64 });
            }

            // Update tickle counter for the original sender
            let senderTickles = await db.fun_counters.get(`${sender.id}.tickles`);
            if (typeof senderTickles !== 'number') senderTickles = 0;
            senderTickles++;
            await db.fun_counters.set(`${sender.id}.tickles`, senderTickles);

            console.log(`[🤣] [TICKLE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${targetName} tickled ${senderName}`);

            const tickleBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> tickled <@${sender.id}> back!\n-# <@${sender.id}> has been tickled a total of ${senderTickles} times.`)
                .setImage(tickleBackGif)
                .setTimestamp();

            await btnInteraction.reply({ embeds: [tickleBackEmbed] });
            collector.stop();
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tickle_back_disabled')
                    .setLabel('🔁 Tickle Back!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
