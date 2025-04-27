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

        if (event == "join") return;

        const guild = oldState.guild;

        const guildConfigPath     = "./src/Utilities/Servers/" + guild.name + "_" + guild.id + "/";
        const VCSettingsPath      = "Settings/vcsettings.json";

        let VCSettings;

        try {
            const VCSettingsData = await fs.readFileSync(guildConfigPath + VCSettingsPath);
            VCSettings = JSON.parse(VCSettingsData);
        } catch ( err ) {
            vcSettings = JSON.parse('{ "activeIds": [] }');
            return;
        }

        const activeIds = VCSettings.activeIds;

        if ( !activeIds.includes(oldState.channel.id) ) return;

        const oldChannel = oldState.channel;

        if (oldChannel.members.size === 0) {
            await oldChannel.delete().catch(err => {
                console.error("[TEMP VC / JOIN TO CREATE] Error deleting channel.");
                console.log(err);
            });

            const index = activeIds.indexOf(oldChannel.id);
            if (index > -1) {
                activeIds.splice(index, 1);
            }

            VCSettings.activeIds = activeIds;

            try {
                await fs.writeFileSync(guildConfigPath + VCSettingsPath, JSON.stringify(VCSettings, null, 2));
            } catch ( err ) {
                console.error("[TEMP VC / JOIN TO CREATE] Error writing channel settings file.");
                console.log(err);
            }
        }
        
        return;

    }
}