const db = require('../../../Handlers/database');

module.exports = {
    name: 'remove-stock-channel',
    aliases: ['removestockchannel'],

    async execute(message, _args) {
        if (!message.guild) return message.reply('This command cannot be used in DMs.');

        const guildId = message.guild.id;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];
        const memberRoles = message.member.roles.cache.map(r => r.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(id => memberRoles.includes(id));

        if (!hasPermission) return message.reply('You do not have the required whitelisted role to use this command.');

        try {
            console.log(`[📈] [REMOVE-STOCK-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message.guild.name} ${guildId} ${message.author.username} removed stock channel`);

            const currentSettings = await db.settings.get(`${guildId}`) || {};

            if (!currentSettings.stockchannel) return message.reply('No FernCoin stock channel is currently set.');

            delete currentSettings.stockchannel;
            delete currentSettings.stockmessageid;
            await db.settings.set(`${guildId}`, currentSettings);

            await message.reply('✅ FernCoin stock channel has been removed.');
        } catch (error) {
            console.error('Error removing stock channel:', error);
            await message.reply('❌ Failed to remove the stock channel.');
        }
    }
};
