const { Events, VoiceState } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * @param {VoiceState} oldState
     * @param {VoiceState} newState
     */
    async execute(oldState, newState) {

        // Ignore if nothing changed
        if (oldState.channelId === newState.channelId) return;

        const member = newState.member ?? oldState.member;
        const guild = member.guild;
        const guildId = guild.id;
        const guildName = guild.name;
        const memberId = member.id;

        const settings = await db.settings.get(`${guildName}_${guildId}`) || {};
        const joinToCreateVC = settings.JoinToCreateVC;

        // Check if user JOINED or SWITCHED INTO the Join To Create channel
        const isEnteringJTC =
            joinToCreateVC &&
            newState.channelId === joinToCreateVC &&
            oldState.channelId !== joinToCreateVC;

        if (isEnteringJTC) {
            // Create temporary VC
            const newChannel = await guild.channels.create({
                name: `${member.user.username}'s Voice`,
                type: 2,
                parent: newState.channel.parent,
                permissionOverwrites: [
                    ...newState.channel.permissionOverwrites.cache.map(overwrite => ({
                        id: overwrite.id,
                        allow: overwrite.allow,
                        deny: overwrite.deny
                    })),
                    {
                        id: member.id,
                        allow: ["Connect", "ViewChannel", "Speak"],
                    }
                ]
            });

            console.log(`[🔊] [JOIN TO CREATE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - ${member.user.username} joined ${newState.channel.name} and ${member.user.username}'s Voice has been Created!`);

            // Move the member to the new temp channel
            await member.voice.setChannel(newChannel).catch(err => {
                console.error("[JTC Error] Failed to move member:", err);
            });

            // Track temporary VC
            const activeIdsKey = `${guildName}_${guildId}_activeVCs`;
            const activeVCs = await db.vc.get(activeIdsKey) || {};
            activeVCs[newChannel.id] = true;
            await db.vc.set(activeIdsKey, activeVCs);
        }

        // Add member to NEW VC
        if (newState.channel && oldState.channelId !== newState.channelId) {
            const key = `${guildName}_${guildId}_members`;
            const vcId = newState.channelId;
            const data = await db.vcmembers.get(key) || {};

            if (!data[vcId]) data[vcId] = {};
            data[vcId][memberId] = true;

            await db.vcmembers.set(key, data);
        }

        // Remove member from OLD VC
        if (oldState.channel && oldState.channelId !== newState.channelId) {
            const key = `${guildName}_${guildId}_members`;
            const oldVcId = oldState.channelId;
            const data = await db.vcmembers.get(key) || {};

            if (data[oldVcId] && data[oldVcId][memberId]) {
                delete data[oldVcId][memberId];

                if (Object.keys(data[oldVcId]).length === 0) delete data[oldVcId];
                await db.vcmembers.set(key, data);
            }
        }
    }
};
