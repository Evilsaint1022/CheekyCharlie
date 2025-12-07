const { Events, VoiceState } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * @param {VoiceState} oldState
     * @param {VoiceState} newState
     */
    async execute(oldState, newState) {
        // If channel did not change → nothing to do
        if (oldState.channelId === newState.channelId) return;

        const guild = oldState.guild || newState.guild;
        const guildId = guild.id;
        const guildName = guild.name;

        const activeIdsKey = `${guildName}_${guildId}_activeVCs`;
        const activeVCs = await db.vc.get(activeIdsKey) || {};

        if (oldState.channel && !newState.channel) {
            await handleChannelLeave(oldState, activeVCs, activeIdsKey);
        }

        if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
            // Only treat as a "leave" for TEMP VC if switching OUTSIDE the temp VC
            await handleChannelLeave(oldState, activeVCs, activeIdsKey);
        }
    }
};


async function handleChannelLeave(oldState, activeVCs, activeIdsKey) {
    const guild = oldState.guild;
    const channelId = oldState.channel.id;

    // Not a JoinToCreate channel → ignore
    if (!activeVCs[channelId]) return;

    const guildName = guild.name;
    const guildId = guild.id;

    console.log(`[🔊] [JOIN TO CREATE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - ${oldState.member.user.username} left and ${oldState.channel.name} has been Deleted!`);

    const tempChannel = oldState.channel;

    // Disconnect bots (console-safe)
    for (const [_, member] of tempChannel.members) {
        if (member.user.bot) {
            try {
                await member.voice.disconnect();
            } catch {}
        }
    }

    // Wait a moment for Discord to update member cache
    await new Promise(resolve => setTimeout(resolve, 1000));

    const refreshed = guild.channels.cache.get(channelId);

    // Channel deleted already → cleanup DB
    if (!refreshed) {
        delete activeVCs[channelId];
        await db.vc.set(activeIdsKey, activeVCs);
        return;
    }

    // Delete temp VC if empty (console-safe)
    if (refreshed.members.size === 0) {
        try {
            await refreshed.delete();
        } catch (err) {
            if (err.code !== 10003) console.error(err);
        }

        delete activeVCs[channelId];
        await db.vc.set(activeIdsKey, activeVCs);
    }
}
