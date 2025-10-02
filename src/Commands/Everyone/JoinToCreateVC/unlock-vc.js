const { SlashCommandBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock-vc')
        .setDescription('Unlock your voice channel by allowing @everyone to Connect again.'),
    async execute(interaction) {
        const member = interaction.member;
        const userId = member.id;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be in a voice channel to use this command.', flags: 64 });
        }

        const guild = interaction.guild;
        const guildId = guild.id;
        const guildName = guild.name;
        const vcId = voiceChannel.id;
        const dbKey = `${guildName}_${guildId}_members`;

        const vcData = await db.vcmembers.get(dbKey);
        if (!vcData || !vcData[vcId]) {
            return interaction.reply({ content: '❌ This voice channel is not tracked or was not created by the bot.', flags: 64 });
        }

        const userList = Object.keys(vcData[vcId]);
        if (userList.length === 0) {
            return interaction.reply({ content: '❌ No tracked users found for this VC.', flags: 64 });
        }

        const creatorId = userList[0];
        if (userId !== creatorId) {
            return interaction.reply({ content: '❌ Only the VC creator can unlock the channel.', flags: 64 });
        }

        try {
            await voiceChannel.permissionOverwrites.edit(voiceChannel.guild.roles.everyone, {
                Connect: null // Reset Connect permission (removes red X)
            });

            // Console Logs
            console.log(`[🌿] [UNLOCK-VC] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the unlock-vc command.`);

            return interaction.reply({ content: '🔓 Voice channel unlocked — @everyone can now join.', flags: 64 });
        } catch (err) {
            console.error('Failed to unlock VC:', err);
            return interaction.reply({ content: '❌ Failed to unlock the voice channel.', flags: 64 });
        }
    }
};
