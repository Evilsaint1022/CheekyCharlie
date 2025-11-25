const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick another member with a random GIF!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member you want to kick')
                .setRequired(true)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const sender = interaction.user;
        const senderName = sender.username;
        const targetName = target.username;
        const guild = interaction.guild;

        if (target.id === sender.id) {
            return interaction.reply({
                content: "You can't kick yourself... that's just sad 😅",
                flags: 64
            });
        }

        const tenorKey = process.env.TENORKEY;
        const kickgifslist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+kick+attack&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
            const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
            randomGif = randomResult.media_formats.gif.url;

            const savedGifs = db.kickgifs.get(kickgifslist) || {};

            if (!Object.values(savedGifs).includes(randomGif)) {
                const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                db.kickgifs.set(`${kickgifslist}.${newKey}`, randomGif);
            }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        if (!randomGif) {
            return interaction.reply({
                content: "No Kick GIFs available right now 😞 Try again later.",
                flags: 64
            });
        }

        const slapcount = Math.floor(Math.random() * 10) + 1;
        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just kicked <@${target.id}>!\n\`${targetName} just received ${slapcount} kicks!\``)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kick_back')
                .setLabel('🔁 Kick Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[👢] [Kick] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${senderName} Kicked ${targetName}`);

        const reply = await interaction.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can Kick back!", flags: 64 });
            }

            let slapBackGif = null;
            try {
                const slapBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+kick+attack&key=${tenorKey}&limit=20`);
                const slapBackData = await slapBackResponse.json();

                if (slapBackData.results && slapBackData.results.length > 0) {
                    const randomResult = slapBackData.results[Math.floor(Math.random() * slapBackData.results.length)];
                    slapBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = db.kickgifs.get(kickgifslist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(slapBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;

                        // ✅ Directly set the nested entry
                        db.kickgifs.set(`${kickgifslist}.${newKey}`, slapBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch slapback from Tenor:", err);
            }

            // ✅ Fallback for slapback
            if (!slapBackGif) {
                const savedGifs = db.kickgifs.get(kickgifslist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    slapBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!slapBackGif) {
                return btnInteraction.reply({ content: "No slap GIFs available right now 😞", flags: 64 });
            }

            console.log(`[👢] [Kick] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${targetName} Kicked ${senderName}`);

            const slapBackCount = Math.floor(Math.random() * 10) + 1;
            const slapBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> Kicked <@${sender.id}> back!\n\`${senderName} just received ${slapBackCount} kicks!\``)
                .setImage(slapBackGif)
                .setTimestamp();

            await btnInteraction.reply({ embeds: [slapBackEmbed] });
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
