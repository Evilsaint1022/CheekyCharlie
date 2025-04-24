const { Events } = require('discord.js'); 
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        const timestamp = new Date().toLocaleTimeString();
        const guildName = message.guild.name;
        const guildId = message.guild.id;
        const userId = message.author.id;
        const username = message.author.username;

        // Define directories
        const levelsDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Economy/Levels`);
        const mutedDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Economy/Muted`);
        const noXpDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Economy/NoXp`);
        const levelSettingsDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Settings`);

        // File paths for user data
        const userLevelFilePath = path.join(levelsDir, `${username}.json`);
        const mutedFilePath = path.join(mutedDir, 'muted.json');
        const channelSettingsFilePath = path.join(levelSettingsDir, 'channelsettings.json');

        // Create directories if they don't exist
        if (!fs.existsSync(levelsDir)) fs.mkdirSync(levelsDir, { recursive: true });
        if (!fs.existsSync(mutedDir)) fs.mkdirSync(mutedDir, { recursive: true });
        if (!fs.existsSync(levelSettingsDir)) fs.mkdirSync(levelSettingsDir, { recursive: true });
        if (!fs.existsSync(noXpDir)) fs.mkdirSync(noXpDir, { recursive: true }); // <-- Added line

        // Check if noxp.json exists
        let noXpFilePath = path.join(noXpDir, 'noxp.json');
        if (fs.existsSync(noXpFilePath)) {
            noXpData = JSON.parse(fs.readFileSync(noXpFilePath, 'utf8'));
            
            if (noXpData.includes(userId)) {
                return; // User is in noxp.json, so don't proceed further
            }
        }

        // Check if user is muted
        let mutedData = {};
        if (fs.existsSync(mutedFilePath)) {
            mutedData = JSON.parse(fs.readFileSync(mutedFilePath, 'utf8'));
        }

        if (mutedData[userId]) {
            return; // User is muted, so don't proceed further
        }

        // Load user level data from their specific JSON file
        let userData = { xp: 0, level: 1 };
        if (fs.existsSync(userLevelFilePath)) {
            userData = JSON.parse(fs.readFileSync(userLevelFilePath, 'utf8'));
        }

        // Load level channel ID from channelsettings.json if it exists
        let levelChannelId = null;
        if (fs.existsSync(channelSettingsFilePath)) {
            try {
                const channelSettings = JSON.parse(fs.readFileSync(channelSettingsFilePath, 'utf8'));
                levelChannelId = channelSettings.LevelChannelId;
            } catch (error) {
                console.error(`Failed to read or parse channelsettings.json for guild ${guildName} (${guildId}):`, error);
            }
        }

        // Generate random XP between 5 and 15 for the user
        const xpGain = Math.floor(Math.random() * 11) + 5;
        userData.xp += xpGain;

        // Calculate XP required for the next level (increments of 350 per level)
        const xpForNextLevel = userData.level * 350;

        // Level up if XP threshold is reached
        if (userData.xp >= xpForNextLevel) {
            userData.xp -= xpForNextLevel;
            userData.level += 1;

            // Determine where to send the level-up message
            let targetChannel = message.channel; // Default to the current channel
            if (levelChannelId) {
                const levelChannel = message.guild.channels.cache.get(levelChannelId);
                if (levelChannel) {
                    targetChannel = levelChannel; // Use the specified channel if valid
                } else {
                }
            }

            // Send the level-up message
            targetChannel.send(`🎉**Congratulations ${message.author.username}!🎉**\n**You've leveled up to level ${userData.level}!**`).then(() => {
                console.log(`[${timestamp}] ${guildName} ${guildId} Level-up message sent to channel ${targetChannel.id} for the user ${message.author.tag}.`);
            }).catch(error => {
                console.error(`Failed to send level-up message to channel ${targetChannel.id}:`, error);
            });
        }

        // Check and update roles for the member (if necessary, this part can be adjusted)
        const currentLevel = userData.level;

        try {
            const userRoles = message.member.roles.cache;

            // You can add custom role management logic here if needed

        } catch (error) {
            console.error(`Failed to update roles for ${message.author.tag}:`, error);
        }

        // Save updated user level data to their respective JSON file
        fs.writeFileSync(userLevelFilePath, JSON.stringify(userData, null, 2));
    },
};
