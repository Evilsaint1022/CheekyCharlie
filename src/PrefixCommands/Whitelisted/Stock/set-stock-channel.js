const db = require('../../../Handlers/database');

module.exports = {
    name: 'set-stock-channel',
    aliases: ['setstockchannel'],

    async execute(message, args) {
        if (!message.guild) return message.reply('This command cannot be used in DMs.');

        const guildId = message.guild.id;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];
        const memberRoles = message.member.roles.cache.map(r => r.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(id => memberRoles.includes(id));

        if (!hasPermission) return message.reply('You do not have the required whitelisted role to use this command.');

        try {
            const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

            if (!channel) return message.reply('❌ Please provide a valid channel.');

            console.log(`[📈] [SET-STOCK-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message.guild.name} ${guildId} ${message.author.username} set stock channel to #${channel.name}`);

            const existing = await db.settings.get(`${guildId}`) || {};
            existing.stockchannel = channel.id;
            await db.settings.set(`${guildId}`, existing);

            await message.reply(`✅ FernCoin stock channel has been set to <#${channel.id}>. It will update on the next tick.`);
        } catch (error) {
            console.error('Error setting stock channel:', error);
            await message.reply('❌ Failed to set the stock channel.');
        }
    }
};
