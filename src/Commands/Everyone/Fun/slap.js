const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Slap another member with a random GIF!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member you want to slap')
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
                content: "You can't slap yourself... that's just sad 😅",
                flags: MessageFlags.Ephemeral
            });
        }

        const tenorKey = process.env.TENORKEY;
        const slapgifslist = 'giflist';
        let randomGif = null;

        try {
            // ✅ Fetch random slap GIF from Tenor
            const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+slap&key=${tenorKey}&limit=20`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
                randomGif = randomResult.media_formats.gif.url;

                const savedGifs = db.slapgifs.get(slapgifslist) || {}; // fallback to empty object

                // Only add if the gif doesn't already exist
                if (!Object.values(savedGifs).includes(randomGif)) {
                    const newKey = `random_${Math.floor(Math.random() * 100000)}`;

                    // ✅ Directly set the nested entry
                    db.slapgifs.set(`${slapgifslist}.${newKey}`, randomGif);
                }
            }
        
        } catch (err) {
            console.error("❌ Failed to fetch from Tenor:", err);
        }

        // ✅ Fallback to saved GIFs
        if (!randomGif) {
            const savedGifs = db.slapgifs.get(slapgifslist) || {};
            const gifValues = Object.values(savedGifs);

            if (gifValues.length > 0) {
                randomGif = gifValues[Math.floor(Math.random() * gifValues.length)];
            }
        }

        if (!randomGif) {
            return interaction.reply({
                content: "No slap GIFs available right now 😞 Try again later.",
                flags: MessageFlags.Ephemeral
            });
        }

        const slapcount = Math.floor(Math.random() * 10) + 1;
        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<@${sender.id}> just slapped <@${target.id}>!\n\`${targetName} just received ${slapcount} slaps!\``)
            .setImage(randomGif)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('slap_back')
                .setLabel('🔁 Slap Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[👋] [SLAP] ${senderName} slapped ${targetName} in ${guild.name}`);
        const reply = await interaction.reply({ embeds: [embed], components: [row] });

        // ✅ Button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can slap back!", flags: MessageFlags.Ephemeral });
            }

            let slapBackGif = null;
            try {
                const slapBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+slap&key=${tenorKey}&limit=20`);
                const slapBackData = await slapBackResponse.json();

                if (slapBackData.results && slapBackData.results.length > 0) {
                    const randomResult = slapBackData.results[Math.floor(Math.random() * slapBackData.results.length)];
                    slapBackGif = randomResult.media_formats.gif.url;

                    let savedGifs = db.slapgifs.get(slapgifslist) || {};
                    if (typeof savedGifs !== 'object' || Array.isArray(savedGifs)) savedGifs = {};

                    const exists = Object.values(savedGifs).includes(slapBackGif);
                    if (!exists) {
                        const newKey = `random_${Math.floor(Math.random() * 100000)}`;

                        // ✅ Directly set the nested entry
                        db.slapgifs.set(`${slapgifslist}.${newKey}`, slapBackGif);
                    }
                }
            } catch (err) {
                console.error("❌ Failed to fetch slapback from Tenor:", err);
            }

            // ✅ Fallback for slapback
            if (!slapBackGif) {
                const savedGifs = db.slapgifs.get(slapgifslist) || {};
                const gifValues = Object.values(savedGifs);
                if (gifValues.length > 0) {
                    slapBackGif = gifValues[Math.floor(Math.random() * gifValues.length)];
                }
            }

            if (!slapBackGif) {
                return btnInteraction.reply({ content: "No slap GIFs available right now 😞", flags: MessageFlags.Ephemeral });
            }

            const slapBackCount = Math.floor(Math.random() * 10) + 1;
            const slapBackEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`<@${target.id}> slapped <@${sender.id}> back!\n\`${senderName} just received ${slapBackCount} slaps!\``)
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
