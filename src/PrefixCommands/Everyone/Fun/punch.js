const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'punch',
    description: 'Punch another member with a random GIF!',
    async execute(message, args) {
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
        const sender = message.author;
        const senderName = sender.username;
        const guild = message.guild;

        if (!target) {
            return message.reply("You need to mention someone or provide a valid user ID to punch!");
        }

        if (target.id === sender.id) {
            return message.reply("You can't punch yourself... that's just sad 😅");
        }

        const targetName = target.username;
        const tenorKey = process.env.TENORKEY;
        const punchgifslist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+punch&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
                randomGif = randomResult.media_formats.gif.url;

                const savedGifs = await db.punchgifs.get(punchgifslist) || {};

                if (!Object.values(savedGifs).includes(randomGif)) {
                    const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                    await db.punchgifs.set(`${punchgifslist}.${newKey}`, randomGif);
                }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        // Fallback to saved GIFs if Tenor fails
        if (!randomGif) {
            const savedGifs = await db.punchgifs.get(punchgifslist) || {};
            const gifValues = Object.values(savedGifs);
            if (gifValues.length > 0) {
                randomGif = gifValues[Math.floor(Math.random() * gifValues.length)];
            }
        }

        if (!randomGif) {
            return message.reply("No punch GIFs available right now 😞 Try again later.");
        }

        // Update punch counter
        let currentPunches = await db.fun_counters.get(`${target.id}.punches`);
        if (typeof currentPunches !== 'number') currentPunches = 0;
        currentPunches++;
        await db.fun_counters.set(`${target.id}.punches`, currentPunches);

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just punched <@${target.id}>!\n-# <@${target.id}> has been punched a total of ${currentPunches} times.`)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('punch_back')
                .setLabel('🔁 Punch Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[🥊] [PUNCH] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${senderName} punched ${targetName}`);

        const reply = await message.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can punch back!", flags: 64 });
            }

            let punchBackGif = null;
            try {
                const punchBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+punch&key=${tenorKey}&limit=20`);
                const punchBackData = await punchBackResponse.json();

                if (punchBackData.results && punchBackData.results.length > 0) {
                    const randomResult = punchBackData.results[Math.floor(Math.random() * punchBackData.results.length)];
                    punchBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = await db.punchgifs.get(punchgifslist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(punchBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                        await db.punchgifs.set(`${punchgifslist}.${newKey}`, punchBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch punchback from Tenor:", err);
            }

            // ✅ Fallback for punchback
            if (!punchBackGif) {
                const savedGifs = await db.punchgifs.get(punchgifslist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    punchBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!punchBackGif) {
                return btnInteraction.reply({ content: "No punch GIFs available right now 😞", flags: 64 });
            }

            // Update punch counter for the original sender
            let senderPunches = await db.fun_counters.get(`${sender.id}.punches`);
            if (typeof senderPunches !== 'number') senderPunches = 0;
            senderPunches++;
            await db.fun_counters.set(`${sender.id}.punches`, senderPunches);

            console.log(`[🥊] [PUNCH] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${targetName} punched ${senderName}`);

            const punchBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> punched <@${sender.id}> back!\n-# <@${sender.id}> has been punched a total of ${senderPunches} times.`)
                .setImage(punchBackGif)
                .setTimestamp();

            await btnInteraction.reply({ embeds: [punchBackEmbed] });
            collector.stop();
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('punch_back_disabled')
                    .setLabel('🔁 Punch Back!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
