// guildMemberAdd.js
const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const checkTime = 10 * 60 * 1000; // 10 minutes in milliseconds

        // Ignore bots
        if (member.user.bot) return;

        const guild = member.guild;
        const guildName = guild.name
        const guildId = guild.id;

        const settingsPath = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Settings/rolesettings.json`);
        let verifiedRoleId;

        try {
            if (fs.existsSync(settingsPath)) {
                const roleSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                verifiedRoleId = roleSettings.VerifiedRoleId;
            }
        } catch (err) {
            console.error(`Failed to read role settings for ${guild.name}:`, err);
            return;
        }

        // Exit early if VerifiedRoleId isn't set
        if (!verifiedRoleId) return;

        // Set a timeout to check the member's role after 10 minutes
        setTimeout(async () => {
            try {
                if (!member.roles.cache.has(verifiedRoleId)) {
                    await member.kick('Didn\'t Verify Quick Enough!');
                }
            } catch (error) {
                console.error(`Failed to kick ${member.user.tag}:`, error);
            }
        }, checkTime);
    },
};
