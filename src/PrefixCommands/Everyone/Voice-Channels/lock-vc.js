const { PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'lock-vc',
    aliases: ['lockvc'],

    async execute(message, args) {
        const member = message.member;
        const userId = member.id;
        const voiceChannel = member.voice.channel;

        // ❌ User not in a VC
        if (!voiceChannel) {
            return message.reply('❌ You must be in a voice channel to use this command.');
        }

        const guild = message.guild;
        const guildId = guild.id;
        const guildName = guild.name;
        const vcId = voiceChannel.id;
        const dbKey = `${guildId}_members`;

        // Load full VC member map from DB
        const vcData = await db.vcmembers.get(dbKey);
        if (!vcData || !vcData[vcId]) {
            return message.reply('❌ This voice channel is not tracked or was not created by the bot.');
        }

        const userList = Object.keys(vcData[vcId]);
        if (userList.length === 0) {
            return message.reply('❌ No tracked users found for this VC.');
        }

        // First user = VC creator
        const creatorId = userList[0];
        if (userId !== creatorId) {
            return message.reply('❌ Only the VC creator can lock the channel.');
        }

        try {
            // 🔒 Deny @everyone from connecting
            await voiceChannel.permissionOverwrites.edit(
                voiceChannel.guild.roles.everyone,
                {
                    Connect: false
                }
            );

            // Console log (unchanged logic)
            console.log(
                `[🌿] [LOCK-VC] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
                `${guildName} ${guildId} ${message.author.username} used the lock-vc command.`
            );

            return message.reply('🔒 Voice channel locked — @everyone is denied Connect.');
        } catch (err) {
            console.error('Failed to lock VC:', err);
            return message.reply('❌ Failed to lock the voice channel.');
        }
    }
};
