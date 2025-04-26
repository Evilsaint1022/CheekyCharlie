const { Events, Message, VoiceState } = require("discord.js");
const fs = require("fs");

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

        if (event == "leave") return;

        const guild = newState.guild;

        const guildConfigPath     = "./src/Utilities/Servers/" + guild.name + "_" + guild.id + "/";
        const channelSettingsPath = "Settings/channelsettings.json";

        let channelSettings;

        try {
            const channelSettingsData = await fs.readFileSync(guildConfigPath + channelSettingsPath);
            channelSettings = JSON.parse(channelSettingsData);
        } catch ( err ) {
            console.error("[TEMP VC / JOIN TO CREATE] Error reading channel settings file.");
            console.log(err);
            return;
        }

        if ( !("joinToCreateVC" in channelSettings) ) return;

        if ( channelSettings.joinToCreateVC != newState.channel.id ) return;

        const newChannel = await guild.channels.create({
            name: newState.member.user.username +"'s Voice",
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

        const VCSettingsPath = "Settings/vcsettings.json";

        if ( !fs.existsSync(guildConfigPath + VCSettingsPath) ) {
            fs.writeFileSync(guildConfigPath + VCSettingsPath, JSON.stringify({ activeIds: [newChannel.id] }, null, 2));
            return;
        }

        let vcSettings;

        try {
            const vcSettingsData = await fs.readFileSync(guildConfigPath + VCSettingsPath);
            vcSettings = JSON.parse(vcSettingsData);
        } catch ( err ) {
            console.error("[TEMP VC / JOIN TO CREATE] Error reading VC settings file.");
            console.log(err);
            return;
        }

        const activeIds = vcSettings.activeIds;

        if ( !activeIds || activeIds.length == 0 ) {
            vcSettings.activeIds = [newChannel.id];
            await fs.writeFileSync(guildConfigPath + VCSettingsPath, JSON.stringify(vcSettings, null, 2));
            return;
        }

        activeIds.push(newChannel.id);

        await fs.writeFileSync(guildConfigPath + VCSettingsPath, JSON.stringify(vcSettings, null, 2));
        return;

    }
}