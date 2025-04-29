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

        if (event === "leave") return;

        const guild = newState.guild;
        const guildId = guild.id;

        // Fetch the Join To Create VC ID from the database
        const joinToCreateVC = await db.config.get(`${guildId}_joinToCreateVC`);

        if (!joinToCreateVC || joinToCreateVC !== newState.channel.id) {return;}

        // Create a new voice channel for the user
        const newChannel = await guild.channels.create({
            name: `${newState.member.user.username}'s Voice`,
            type: 2,
            parent: newState.channel.parent,
            permissionOverwrites: newState.channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                allow: overwrite.allow,
                deny: overwrite.deny
            }))
        });

        // Move the user to the new channel
        await newState.member.voice.setChannel(newChannel).catch(err => {
            console.error("[TEMP VC / JOIN TO CREATE] Error moving member to new channel.");
            console.log(err);
        });

        // Update the active voice channels in the database
        const activeIdsKey = `${guildId}_activeVCs`;
        const activeIds = await db.config.get(activeIdsKey) || [];

        activeIds.push(newChannel.id);
        db.config.set(activeIdsKey, activeIds);

        return;
    }
};
