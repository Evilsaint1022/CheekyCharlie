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

        if (oldState.channel && !newState.channel) {
            const guild = oldState.guild;
            const guildId = guild.id;
            const guildName = guild.name;

            const activeIdsKey = `${guildName}_${guildId}_activeVCs`;
            const activeVCs = await db.vc.get(activeIdsKey) || {};

            if (!activeVCs[oldState.channel.id]) return;

            console.log(`[🔊] [JOIN TO CREATE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - ${oldState.member.user.username} left and ${oldState.channel.name} has been Deleted!`);

            const oldChannel = oldState.channel;

            for (const [_, member] of oldChannel.members) {
                if (member.user && member.user.bot) {
                    try {
                        await member.voice.disconnect();
                    } catch (err) {
                        console.error(`[TEMP VC / JOIN TO CREATE] Failed to disconnect bot ${member.user?.tag ?? member.id}:`, err);
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            const refreshedChannel = guild.channels.cache.get(oldChannel.id);

            if (refreshedChannel && refreshedChannel.members.size === 0) {
                try {
                    await refreshedChannel.delete();
                } catch (err) {
                    if (err.code !== 10003) {
                        console.error("[TEMP VC / JOIN TO CREATE] Error deleting channel.");
                        console.error(err);
                    }
                }

                delete activeVCs[oldChannel.id];

                await db.vc.set(activeIdsKey, activeVCs);
            }
        }
    }
};
