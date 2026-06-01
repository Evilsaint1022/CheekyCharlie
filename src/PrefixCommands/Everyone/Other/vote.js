const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'vote',
    aliases: ['v'],

    async execute(message) {

        const embed = new EmbedBuilder()
            .setTitle('🌿 **__Vote For The CheekyCharlie__** 🌿')
            .setDescription(
                '***Support the bot by voting on Top.gg!***\n\n' +
                '🔗 _[Vote Here!](https://top.gg/bot/1495254230787817564/vote)_'
            )
            .setThumbnail(message.guild.iconURL())
            .setColor(0x207e37)

            console.log(
                `[🌿] [VOTE] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
                `${message.guild.name} ${message.guild.id} ${message.author.username} used the vote command.`
            )

        await message.channel.send({ embeds: [embed] });
    }
};
