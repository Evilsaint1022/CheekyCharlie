const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Show a custom emoji as an image (PNG/GIF).')
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('Enter a custom emoji')
                .setRequired(true)
        ),

    async execute(interaction) {
        const input = interaction.options.getString('emoji');

        // CUSTOM EMOJI FORMAT CHECK
        // Matches: <:name:123456789> or <a:name:123456789>
        const match = input.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);

        if (!match) {
            return interaction.reply({
                content: '❌ Only **custom Discord emojis** are allowed. Built-in emojis like 😀 or ❄️ are blocked.',
                flags: 64
            });
        }

        const guild = interaction.guild;
        const emojiName = match[1];
        const emojiId = match[2];
        const isAnimated = input.startsWith('<a:');

        // DIRECT DISCORD CDN URL (works even from other servers)
        const imageURL = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?quality=lossless`;

         console.log(`[🌿] [EMOJI] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.username} used the emoji command to get ${emojiName} ${emojiId}`);

        // Build embed
        const embed = new EmbedBuilder()
            .setTitle(`🌿**__Here is the following emoji:__**`)
            .setDescription(`Emoji Name: ${emojiName}\nEmoji ID: ${emojiId}`)
            .setImage(imageURL)
            .setColor('#de4949');

        return interaction.reply({ embeds: [embed] });
    }
};
