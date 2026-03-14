// confession.js
const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
    name: 'confession',
    aliases: ['confess'],

    async execute(message, args) {

        const channel = message.channel;

        // Prevent usage in DMs
        if (!message.guild) {
           return message.reply('❌ This command cannot be used in DMs.');
        }

        const confession = args.join(' ');
        if (!confession) {
            return channel.send('❌ Please provide a message to confess.\nExample: `?confession I feel overwhelmed today`');
        }

        const ConfessionChannelId = await db.settings.get(`${message.guild.id}.confessionChannelId`);

        let ConfessionChannel;
        try {
            ConfessionChannel = await message.guild.channels.fetch(ConfessionChannelId);
        } catch (err) {
            ConfessionChannel = null;
        }

        if (!ConfessionChannelId || !ConfessionChannel) {
            return message.reply('❌ **There is currently no confession channel set!**');
            
        }

        setTimeout(async () => {
        try {
        if (message.deletable) await message.delete();
        } catch (err) {
        if (err.code === 10008) return;
        console.error('Error deleting confession message:', err);
                }
        }, 1000);


        // 🫰🏻 Anonymous vent container (Components v2)
        const confessionContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('🌿 **__Anonymous Confession!__** 🌿'),
                new TextDisplayBuilder()
                    .setContent(confession)
            );

        const confessionMessage = await ConfessionChannel.send({
            components: [confessionContainer],
            flags: [MessageFlags.IsComponentsV2]
        });

        console.log(
            `[🌿] [CONFESSIONS] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
            `${message.guild.name} ${message.guild.id} ${message.author.username} used the confession command.`
        );

        return channel.send(
            '✅ **Confession message successfully sent! Check it out:** ' + confessionMessage.url
        );
    }
};
