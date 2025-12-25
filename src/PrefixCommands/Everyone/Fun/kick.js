const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'kick',
    description: 'Kick another member with a random GIF!',
    async execute(message, args) {
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
        const sender = message.author;
        const senderName = sender.username;
        const guild = message.guild;

        if (!target) {
            return message.reply("You need to mention someone or provide a valid user ID to kick!");
        }

        if (target.id === sender.id) {
            return message.reply("You can't kick yourself... that's just sad 😅");
        }

        const targetName = target.username;
        const tenorKey = process.env.TENORKEY;
        const kickgifslist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+kick+attack&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
                randomGif = randomResult.media_formats.gif.url;

                const savedGifs = await db.kickgifs.get(kickgifslist) || {};

                if (!Object.values(savedGifs).includes(randomGif)) {
                    const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                    await db.kickgifs.set(`${kickgifslist}.${newKey}`, randomGif);
                }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        // Fallback to saved GIFs if Tenor fails
        if (!randomGif) {
            const savedGifs = await db.kickgifs.get(kickgifslist) || {};
            const gifValues = Object.values(savedGifs);
            if (gifValues.length > 0) {
                randomGif = gifValues[Math.floor(Math.random() * gifValues.length)];
            }
        }

        if (!randomGif) {
            return message.reply("No kick GIFs available right now 😞 Try again later.");
        }

        // Update kick counter
        let currentKicks = await db.fun_counters.get(`${target.id}.kicks`);
        if (typeof currentKicks !== 'number') currentKicks = 0;
        currentKicks++;
        await db.fun_counters.set(`${target.id}.kicks`, currentKicks);

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just kicked <@${target.id}>!\n-# <@${target.id}> has been kicked a total of ${currentKicks} times.`)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kick_back')
                .setLabel('🔁 Kick Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[👢] [KICK] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${senderName} kicked ${targetName}`);

        const reply = await message.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can kick back!", flags: 64 });
            }

            let kickBackGif = null;
            try {
                const kickBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+kick+attack&key=${tenorKey}&limit=20`);
                const kickBackData = await kickBackResponse.json();

                if (kickBackData.results && kickBackData.results.length > 0) {
                    const randomResult = kickBackData.results[Math.floor(Math.random() * kickBackData.results.length)];
                    kickBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = await db.kickgifs.get(kickgifslist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(kickBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                        await db.kickgifs.set(`${kickgifslist}.${newKey}`, kickBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch kickback from Tenor:", err);
            }

            // ✅ Fallback for kickback
            if (!kickBackGif) {
                const savedGifs = await db.kickgifs.get(kickgifslist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    kickBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!kickBackGif) {
                return btnInteraction.reply({ content: "No kick GIFs available right now 😞", flags: 64 });
            }

            // Update kick counter for the original sender
            let senderKicks = await db.fun_counters.get(`${sender.id}.kicks`);
            if (typeof senderKicks !== 'number') senderKicks = 0;
            senderKicks++;
            await db.fun_counters.set(`${sender.id}.kicks`, senderKicks);

            console.log(`[👢] [KICK] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${targetName} kicked ${senderName}`);

            const kickBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> kicked <@${sender.id}> back!\n-# <@${sender.id}> has been kicked a total of ${senderKicks} times.`)
                .setImage(kickBackGif)
                .setTimestamp();

            await btnInteraction.reply({ embeds: [kickBackEmbed] });
            collector.stop();
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('kick_back_disabled')
                    .setLabel('🔁 Kick Back!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
