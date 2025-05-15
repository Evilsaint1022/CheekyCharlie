const { Events, VoiceState } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * @param {VoiceState} oldState
     * @param {VoiceState} newState
     */
    async execute(oldState, newState) {
        let event = "";

        if (oldState.channel == null && newState.channel != null) {
            event = "join";
        }

        if (oldState.channel != null && newState.channel == null) {
            event = "leave";
        }

        if (event === "join") return;

        const guild = oldState.guild;
        const guildId = guild.id;
        const guildName = guild.name;

        const activeIdsKey = `${guildName}_${guildId}_activeVCs`;
        const activeIds = await db.vc.get(activeIdsKey) || [];

        if (!activeIds.includes(oldState.channel.id)) return;

        const oldChannel = oldState.channel;

        // Disconnect bots
        for (const [_, member] of oldChannel.members) {
            if (member.user && member.user.bot) {
                try {
                    await member.voice.disconnect();
                } catch (err) {
                    console.error(`[TEMP VC / JOIN TO CREATE] Failed to disconnect bot ${member.user?.tag ?? member.id}:`, err);
                }
            }
        }

        // Small delay for disconnections to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if the channel still exists
        const refreshedChannel = guild.channels.cache.get(oldChannel.id);

        if (refreshedChannel && refreshedChannel.members.size === 0) {
            try {
                await refreshedChannel.delete();
            } catch (err) {
                if (err.code === 10003) {
                } else {
                    console.error("[TEMP VC / JOIN TO CREATE] Error deleting channel.");
                    console.error(err);
                }
            }

            // Update database
            const index = activeIds.indexOf(oldChannel.id);
            if (index > -1) activeIds.splice(index, 1);
            db.vc.set(activeIdsKey, activeIds);
        }

        return;
    }
};
