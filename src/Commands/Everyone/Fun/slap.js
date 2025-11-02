const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
        const middle = `· · - ┈┈━━ ˚ . 👋 SLAP! . ˚ ━━┈┈ - · ·`;
        const target = interaction.options.getUser('target');
        const sender = interaction.user;
        const senderName = sender.username;
        const targetName = target.username; 
        const guild = interaction.guild;

        // ✅ List of anime + cartoon slap GIFs
        const gifs = [
            // Anime slaps
            'https://media.giphy.com/media/jLeyZWgtwgr2U/giphy.gif',
            'https://media.giphy.com/media/mEtSQlxqBtWWA/giphy.gif',
            'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
            'https://media.giphy.com/media/RXGNsyRb1hDJm/giphy.gif',
            'https://media.giphy.com/media/3XlEk2RxPS1m8/giphy.gif',
            'https://media.giphy.com/media/9U5J7JpaYBr68/giphy.gif',
            'https://media.giphy.com/media/10Am8idu3qBYRy/giphy.gif',
            'https://media.giphy.com/media/xUNd9HZq1itMkiK652/giphy.gif',
            'https://media.giphy.com/media/fO6UtDy5pWYwM/giphy.gif',
            'https://media.giphy.com/media/WLXO8OZmq0JK8/giphy.gif',

            // Cartoon slaps
            'https://media.tenor.com/3ZqYk7bq-2IAAAAC/tom-and-jerry-slap.gif',
            'https://media.tenor.com/VZbPH6zRliYAAAAC/spongebob-patrick.gif',
            'https://media.tenor.com/TKpmh8wAOjEAAAAC/slap-homer.gif',
            'https://media.tenor.com/5aL2X2pDHkMAAAAd/slap-funny.gif',
            'https://media.tenor.com/XiYuY3J4QqAAAAAC/slap-angry.gif',
            'https://media.tenor.com/MeP0f5d5hCkAAAAC/slap-cartoon.gif',
            'https://media.tenor.com/RVvnVPK-6dcAAAAC/anime-slap.gif',
            'https://media.tenor.com/4kJp-PzWvBYAAAAC/anime-girl-slap.gif'
        ];

        // ✅ Pick a random GIF
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

        // Prevent slapping yourself
        if (target.id === sender.id) {
            return interaction.reply({
                content: "You can't slap yourself... that's just sad 😅",
                flags: 64
            });
        }

        // ✅ Embed that mentions both users
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setTitle(middle)
            .setDescription(`<@${sender.id}> just slapped <@${target.id}>!`)
            .setImage(randomGif)
            .setTimestamp();

            console.log(`[👋] [SLAP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${senderName} slapped ${targetName}`);

        await interaction.reply({ embeds: [embed] });
    }
};
