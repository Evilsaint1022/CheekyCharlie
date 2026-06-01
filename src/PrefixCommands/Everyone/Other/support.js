const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'support',
    aliases: ['server', 'discord'],

    async execute(message) {

        const inviteLink = 'https://discord.com/invite/3gtJ33cZDH';

        const embed = new EmbedBuilder()
            .setTitle('🌿 **__Support Server__** 🌿')
            .setDescription(
                `Need help, want to report a bug, or have a suggestion?\n\n` +
                `🔗 **Join our support server:**\n ${inviteLink}`
            )
            .setColor(0x207e37)
            .setThumbnail(message.guild.iconURL())

            console.log(
                `[🌿] [SUPPORT] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
                `${message.guild.name} ${message.guild.id} ${message.author.username} used the support command.`
            )

        await message.channel.send({ embeds: [embed] });
    }
};