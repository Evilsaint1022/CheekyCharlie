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

        if (!oldState.channel && newState.channel) {
            const guild = newState.guild;
            const guildId = guild.id;
            const guildName = guild.name;

            const settings = await db.settings.get(`${guildName}_${guildId}`) || {};
            const joinToCreateVC = settings.JoinToCreateVC;

            if (!joinToCreateVC || joinToCreateVC !== newState.channel.id) return;

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

            await newState.member.voice.setChannel(newChannel).catch(err => {
                console.error("[TEMP VC / JOIN TO CREATE] Error moving member to new channel.");
                console.log(err);
            });

            const activeIdsKey = `${guildName}_${guildId}_activeVCs`;
            const activeVCs = await db.vc.get(activeIdsKey) || {};

            activeVCs[newChannel.id] = true;

            await db.vc.set(activeIdsKey, activeVCs);
        }
    }
};
