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

        // Fetch the active voice channels from the database
        const activeIdsKey = `${guildId}_activeVCs`;
        const activeIds = await db.config.get(activeIdsKey) || [];

        if (!activeIds.includes(oldState.channel.id)) return;

        const oldChannel = oldState.channel;

        // Check if the channel is empty
        if (oldChannel.members.size === 0) {
            await oldChannel.delete().catch(err => {
                console.error("[TEMP VC / JOIN TO CREATE] Error deleting channel.");
                console.log(err);
            });

            // Remove the channel ID from the active voice channels list
            const index = activeIds.indexOf(oldChannel.id);
            if (index > -1) {
                activeIds.splice(index, 1);
            }

            // Update the active voice channels in the database
            db.config.set(activeIdsKey, activeIds);
        }

        return;
    }
};
