const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const timestamp = new Date().toLocaleTimeString();
        const guildId = message.guild.id;
        const userId = message.author.id;
        const username = message.author.username;

        // Check if the user is in the noXP list
        const noXpList = await db.config.get(`${guildId}_noXpUsers`) || [];
        if (noXpList.includes(userId)) {
            return; // User is in the noXP list, so don't proceed further
        }

        // Check if the user is muted
        const mutedUsers = await db.config.get(`${guildId}_mutedUsers`) || {};
        if (mutedUsers[userId]) {
            return; // User is muted, so don't proceed further
        }

        // Fetch user level data from the database
        const userKey = `${guildId}_${userId}_level`;
        let userData = await db.economy.get(userKey) || { xp: 0, level: 1 };

        // Generate random XP between 5 and 15 for the user
        const xpGain = Math.floor(Math.random() * 11) + 5;
        userData.xp += xpGain;

        // Calculate XP required for the next level (increments of 350 per level)
        const xpForNextLevel = userData.level * 350;

        // Level up if XP threshold is reached
        if (userData.xp >= xpForNextLevel) {
            userData.xp -= xpForNextLevel;
            userData.level += 1;

            // Fetch the level-up channel ID from the database
            const levelChannelId = await db.config.get(`${guildId}_levelChannelId`);
            let targetChannel = message.channel; // Default to the current channel

            if (levelChannelId) {
                const levelChannel = message.guild.channels.cache.get(levelChannelId);
                if (levelChannel) {
                    targetChannel = levelChannel; // Use the specified channel if valid
                }
            }

            // Send the level-up message
            targetChannel.send(`🎉**Congratulations ${message.author.username}!🎉**\n**You've leveled up to level ${userData.level}!**`).then(() => {
                console.log(`[${timestamp}] ${message.guild.name} ${guildId} Level-up message sent to channel ${targetChannel.id} for the user ${message.author.tag}.`);
            }).catch(error => {
                console.error(`Failed to send level-up message to channel ${targetChannel.id}:`, error);
            });
        }

        // Save updated user level data to the database
        db.economy.set(userKey, userData);
    },
};
