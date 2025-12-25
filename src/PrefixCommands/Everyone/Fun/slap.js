const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'slap',
    description: 'Slap another member with a random GIF!',
    async execute(message, args) {
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
        const sender = message.author;
        const senderName = sender.username;
        const guild = message.guild;

        if (!target) {
            return message.reply("You need to mention someone or provide a valid user ID to slap!");
        }

        if (target.id === sender.id) {
            return message.reply("You can't slap yourself... that's just sad 😅");
        }

        const targetName = target.username;
        const tenorKey = process.env.TENORKEY;
        const slapgifslist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+slap&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
                randomGif = randomResult.media_formats.gif.url;

                const savedGifs = await db.slapgifs.get(slapgifslist) || {};

                if (!Object.values(savedGifs).includes(randomGif)) {
                    const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                    await db.slapgifs.set(`${slapgifslist}.${newKey}`, randomGif);
                }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        // Fallback to saved GIFs if Tenor fails
        if (!randomGif) {
            const savedGifs = await db.slapgifs.get(slapgifslist) || {};
            const gifValues = Object.values(savedGifs);
            if (gifValues.length > 0) {
                randomGif = gifValues[Math.floor(Math.random() * gifValues.length)];
            }
        }

        if (!randomGif) {
            return message.reply("No slap GIFs available right now 😞 Try again later.");
        }

        // Update slap counter
        let currentSlaps = await db.fun_counters.get(`${target.id}.slaps`);
        if (typeof currentSlaps !== 'number') currentSlaps = 0;
        currentSlaps++;
        await db.fun_counters.set(`${target.id}.slaps`, currentSlaps);

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just slapped <@${target.id}>!\n-# <@${target.id}> has been slapped a total of ${currentSlaps} times.`)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('slap_back')
                .setLabel('🔁 Slap Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[👋] [SLAP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${senderName} slapped ${targetName}`);

        const reply = await message.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can slap back!", flags: 64 });
            }

            let slapBackGif = null;
            try {
                const slapBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+slap&key=${tenorKey}&limit=20`);
                const slapBackData = await slapBackResponse.json();

                if (slapBackData.results && slapBackData.results.length > 0) {
                    const randomResult = slapBackData.results[Math.floor(Math.random() * slapBackData.results.length)];
                    slapBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = await db.slapgifs.get(slapgifslist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(slapBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                        await db.slapgifs.set(`${slapgifslist}.${newKey}`, slapBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch slapback from Tenor:", err);
            }

            // ✅ Fallback for slapback
            if (!slapBackGif) {
                const savedGifs = await db.slapgifs.get(slapgifslist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    slapBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!slapBackGif) {
                return btnInteraction.reply({ content: "No slap GIFs available right now 😞", flags: 64 });
            }

            // Update slap counter for the original sender
            let senderSlaps = await db.fun_counters.get(`${sender.id}.slaps`);
            if (typeof senderSlaps !== 'number') senderSlaps = 0;
            senderSlaps++;
            await db.fun_counters.set(`${sender.id}.slaps`, senderSlaps);

            console.log(`[👋] [SLAP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${targetName} slapped ${senderName}`);

            const slapBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> slapped <@${sender.id}> back!\n-# <@${sender.id}> has been slapped a total of ${senderSlaps} times.`)
                .setImage(slapBackGif)
                .setTimestamp();

            await btnInteraction.reply({ embeds: [slapBackEmbed] });
            collector.stop();
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('slap_back_disabled')
                    .setLabel('🔁 Slap Back!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
