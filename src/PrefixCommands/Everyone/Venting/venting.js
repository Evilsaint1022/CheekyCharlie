// venting.js
const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
    name: 'venting',
    aliases: ['vent'],

    async execute(message, args) {

        const channel = message.channel;

        // Prevent usage in DMs
        if (!message.guild) {
           return message.reply('❌ This command cannot be used in DMs.');
        }

        const confession = args.join(' ');
        if (!confession) {
            return channel.send('❌ Please provide a message to vent.\nExample: `?venting I feel overwhelmed today`');
        }

        const ventChannelId = await db.settings.get(`${message.guild.id}.ventChannelId`);

        let ventChannel;
        try {
            ventChannel = await message.guild.channels.fetch(ventChannelId);
        } catch (err) {
            ventChannel = null;
        }

        if (!ventChannelId || !ventChannel) {
            return message.reply('❌ **There is currently no vent channel set!**');
            
        }

        setTimeout(async () => {
        try {
        if (message.deletable) await message.delete();
        } catch (err) {
        if (err.code === 10008) return;
        console.error('Error deleting vent message:', err);
                }
        }, 1000);


        // 🫰🏻 Anonymous vent container (Components v2)
        const confessionContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('**🫰🏻 __New Anonymous Vent!__**'),
                new TextDisplayBuilder()
                    .setContent(confession)
            );

        const confessionMessage = await ventChannel.send({
            components: [confessionContainer],
            flags: [MessageFlags.IsComponentsV2]
        });

        console.log(
            `[🌿] [VENTING] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
            `${message.guild.name} ${message.guild.id} ${message.author.username} used the venting command.`
        );

        return channel.send(
            '✅ **Vent message successfully sent! Check it out:** ' + confessionMessage.url
        );
    }
};
