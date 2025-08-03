const { Events, VoiceState } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * @param {VoiceState} oldState
     * @param {VoiceState} newState
     */
    async execute(oldState, newState) {
        if (oldState.channelId === newState.channelId) return;

        const member = newState.member;
        const guild = newState.guild;
        const guildId = guild.id;
        const guildName = guild.name;
        const memberId = member.id;

        // 🔹 Handle JoinToCreate VC logic
        if (!oldState.channel && newState.channel) {
            const settings = await db.settings.get(`${guildName}_${guildId}`) || {};
            const joinToCreateVC = settings.JoinToCreateVC;

            if (joinToCreateVC && joinToCreateVC === newState.channel.id) {
                const newChannel = await guild.channels.create({
                    name: `${member.user.username}'s Voice`,
                    type: 2,
                    parent: newState.channel.parent,
                    permissionOverwrites: newState.channel.permissionOverwrites.cache.map(overwrite => ({
                        id: overwrite.id,
                        allow: overwrite.allow,
                        deny: overwrite.deny
                    }))
                });

                await member.voice.setChannel(newChannel).catch(err => {
                    console.error("[TEMP VC / JOIN TO CREATE] Error moving member to new channel.");
                    console.log(err);
                });

                const activeIdsKey = `${guildName}_${guildId}_activeVCs`;
                const activeVCs = await db.vc.get(activeIdsKey) || {};
                activeVCs[newChannel.id] = true;
                await db.vc.set(activeIdsKey, activeVCs);
            }
        }

        // 🔹 Add member to new VC channel entry
        if (newState.channel && (!oldState.channel || oldState.channelId !== newState.channelId)) {
            const key = `${guildName}_${guildId}_members`;
            const vcChannelId = newState.channel.id;
            const vcMembersData = await db.vcmembers.get(key) || {};

            if (!vcMembersData[vcChannelId]) {
                vcMembersData[vcChannelId] = {};
            }

            vcMembersData[vcChannelId][memberId] = true;
            await db.vcmembers.set(key, vcMembersData);
        }

        // 🔹 Remove member from old VC channel entry
        if (oldState.channel && (!newState.channel || oldState.channelId !== newState.channelId)) {
            const key = `${guildName}_${guildId}_members`;
            const oldChannelId = oldState.channel.id;
            const vcMembersData = await db.vcmembers.get(key) || {};

            if (vcMembersData[oldChannelId] && vcMembersData[oldChannelId][memberId]) {
                delete vcMembersData[oldChannelId][memberId];

                // Optionally clean up empty objects
                if (Object.keys(vcMembersData[oldChannelId]).length === 0) {
                    delete vcMembersData[oldChannelId];
                }

                await db.vcmembers.set(key, vcMembersData);
            }
        }
    }
};
