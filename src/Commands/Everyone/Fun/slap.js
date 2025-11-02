const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch'); // ✅ built-in in Node 18+, or `npm install node-fetch`

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

        // Prevent slapping yourself
        if (target.id === sender.id) {
            return interaction.reply({
                content: "You can't slap yourself... that's just sad 😅",
                flags: 64
            });
        }

        // ✅ Fetch a random slap GIF from Tenor API
        const tenorKey = process.env.TENORKEY; // Tenor’s public demo key (you can replace it with your own)
        const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+slap&key=${tenorKey}&limit=20`);
        const data = await response.json();

        let randomGif = null;
        if (data.results && data.results.length > 0) {
            const randomResult = data.results[Math.floor(Math.random() * data.results.length)];
            randomGif = randomResult.media_formats.gif.url;
        }

        // ✅ Fallback if API fails
        if (!randomGif) {
            randomGif = 'https://media.tenor.com/6N2e6QKxI6sAAAAC/anime-slap.gif';
        }

        // ✅ Generate random slap count
        const slapcount = Math.floor(Math.random() * 10) + 1;
        const title = `<@${sender.id}> just slapped <@${target.id}>!`;

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`${title}\n\`${targetName} just received ${slapcount} slaps!\``)
            .setImage(randomGif)
            .setTimestamp();

        // ✅ Create “Slap Back” button
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('slap_back')
                .setLabel('🔁 Slap Back!')
                .setStyle(ButtonStyle.Primary)
        );

        console.log(`[👋] [SLAP] ${senderName} slapped ${targetName} in ${guild.name}`);

        const reply = await interaction.reply({ embeds: [embed], components: [row] });

        // ✅ Set up button collector
        const collector = reply.createMessageComponentCollector({ time: 30_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== target.id) {
                return btnInteraction.reply({ content: "Only the target can slap back!", ephemeral: true });
            }

            // ✅ Get new slap GIF for slapback
            const slapBackResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+slap&key=${tenorKey}&limit=20`);
            const slapBackData = await slapBackResponse.json();

            let slapBackGif = null;
            if (slapBackData.results && slapBackData.results.length > 0) {
                const randomResult = slapBackData.results[Math.floor(Math.random() * slapBackData.results.length)];
                slapBackGif = randomResult.media_formats.gif.url;
            }

            if (!slapBackGif) slapBackGif = 'https://media.tenor.com/6N2e6QKxI6sAAAAC/anime-slap.gif';

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
