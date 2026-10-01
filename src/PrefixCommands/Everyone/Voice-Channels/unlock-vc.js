const db = require('../../../Handlers/database');

module.exports = {
    name: 'unlock-vc',
    aliases: ['unlockvc'],

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

        // Load VC data from DB
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
            return message.reply('❌ Only the VC creator can unlock the channel.');
        }

        try {
            // 🔓 Reset Connect permission for @everyone
            await voiceChannel.permissionOverwrites.edit(
                voiceChannel.guild.roles.everyone,
                {
                    Connect: null // Removes explicit allow/deny
                }
            );

            // Console log (same format as slash command)
            console.log(
                `[🌿] [UNLOCK-VC] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
                `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
                `${guildName} ${guildId} ${message.author.username} used the unlock-vc command.`
            );

            return message.reply('🔓 Voice channel unlocked — @everyone can now join.');
        } catch (err) {
            console.error('Failed to unlock VC:', err);
            return message.reply('❌ Failed to unlock the voice channel.');
        }
    }
};
