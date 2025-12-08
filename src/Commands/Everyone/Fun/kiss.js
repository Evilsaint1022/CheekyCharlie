const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Kiss another member with a random GIF!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member you want to kiss')
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
                content: "You can't kiss yourself... that's just weird 😅",
                flags: 64
            });
        }

        const tenorKey = process.env.TENORKEY;
        const kissgiflist = 'giflist';
        let randomGif = null;

        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+kiss&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
            const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
            randomGif = randomResult.media_formats.gif.url;

            const savedGifs = db.kissgifs.get(kissgiflist) || {};

            if (!Object.values(savedGifs).includes(randomGif)) {
                const newKey = `random_${Math.floor(Math.random() * 100000)}`;
                db.kissgifs.set(`${kissgiflist}.${newKey}`, randomGif);
            }
            }
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        if (!randomGif) {
            return interaction.reply({
                content: "No kiss GIFs available right now 😞 Try again later.",
                flags: 64
            });
        }

        const kisscount = Math.floor(Math.random() * 10) + 1;
        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just kissed <@${target.id}>!\n\`${targetName} just received ${kisscount} kisses!\``)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kiss_back')
                .setLabel('🔁 Kiss Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[💋] [KISS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${senderName} kissed ${targetName}`);

        const reply = await interaction.reply({ embeds: [embed], components: [row] });

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

                    let savedGifs = db.kissgifs.get(kissgiflist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(kissBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;

                        // ✅ Directly set the nested entry
                        db.kissgifs.set(`${kissgiflist}.${newKey}`, kissBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch kissback from Tenor:", err);
            }

            // ✅ Fallback for kissback
            if (!kissBackGif) {
                const savedGifs = db.kissgifs.get(kissgiflist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    kissBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!kissBackGif) {
                return btnInteraction.reply({ content: "No kiss GIFs available right now 😞", flags: 64 });
            }

            console.log(`[💋] [KISS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${targetName} kissed ${senderName}`);

            const kissBackCount = Math.floor(Math.random() * 10) + 1;
            const kissBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> kissed <@${sender.id}> back!\n\`${senderName} just received ${kissBackCount} kisses!\``)
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
