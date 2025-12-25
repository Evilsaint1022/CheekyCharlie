const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'kiss',
    description: 'Kiss another member with a random GIF!',
    async execute(message, args) {
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
        const sender = message.author;
        const senderName = sender.username;
        const guild = message.guild;

        if (!target) {
            return message.reply("You need to mention someone or provide a valid user ID to kiss!");
        }

        if (target.id === sender.id) {
            return message.reply("You can't kiss yourself... that's just weird 😅");
        }

        const targetName = target.username;
        const tenorKey = process.env.TENORKEY;
        const kissgiflist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+kiss&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
                randomGif = randomResult.media_formats.gif.url;

                const savedGifs = await db.kissgifs.get(kissgiflist) || {};

                if (!Object.values(savedGifs).includes(randomGif)) {
                    const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                    await db.kissgifs.set(`${kissgiflist}.${newKey}`, randomGif);
                }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        // Fallback to saved GIFs if Tenor fails
        if (!randomGif) {
            const savedGifs = await db.kissgifs.get(kissgiflist) || {};
            const gifValues = Object.values(savedGifs);
            if (gifValues.length > 0) {
                randomGif = gifValues[Math.floor(Math.random() * gifValues.length)];
            }
        }

        if (!randomGif) {
            return message.reply("No kiss GIFs available right now 😞 Try again later.");
        }

        // Update kiss counter
        let currentKisses = await db.fun_counters.get(`${target.id}.kisses`);
        if (typeof currentKisses !== 'number') currentKisses = 0;
        currentKisses++;
        await db.fun_counters.set(`${target.id}.kisses`, currentKisses);

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just kissed <@${target.id}>!\n-# <@${target.id}> has been kissed a total of ${currentKisses} times.`)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kiss_back')
                .setLabel('🔁 Kiss Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[💋] [KISS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${senderName} kissed ${targetName}`);

        const reply = await message.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can kiss back!", flags: 64 });
            }

            let kissBackGif = null;
            try {
                const kissBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+kiss&key=${tenorKey}&limit=20`);
                const kissBackData = await kissBackResponse.json();

                if (kissBackData.results && kissBackData.results.length > 0) {
                    const randomResult = kissBackData.results[Math.floor(Math.random() * kissBackData.results.length)];
                    kissBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = await db.kissgifs.get(kissgiflist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(kissBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                        await db.kissgifs.set(`${kissgiflist}.${newKey}`, kissBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch kissback from Tenor:", err);
            }

            // ✅ Fallback for kissback
            if (!kissBackGif) {
                const savedGifs = await db.kissgifs.get(kissgiflist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    kissBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!kissBackGif) {
                return btnInteraction.reply({ content: "No kiss GIFs available right now 😞", flags: 64 });
            }

            // Update kiss counter for the original sender
            let senderKisses = await db.fun_counters.get(`${sender.id}.kisses`);
            if (typeof senderKisses !== 'number') senderKisses = 0;
            senderKisses++;
            await db.fun_counters.set(`${sender.id}.kisses`, senderKisses);

            console.log(`[💋] [KISS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${targetName} kissed ${senderName}`);

            const kissBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> kissed <@${sender.id}> back!\n-# <@${sender.id}> has been kissed a total of ${senderKisses} times.`)
                .setImage(kissBackGif)
                .setTimestamp();

            await btnInteraction.reply({ embeds: [kissBackEmbed] });
            collector.stop();
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('kiss_back_disabled')
                    .setLabel('🔁 Kiss Back!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
