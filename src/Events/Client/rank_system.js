const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || message.channel.isDMBased()) return;

        const { guild, member, author } = message;

        const userId = author.id;
        const username = author.username;
        const guildId = guild.id;
        const guildName = guild.name;

        const levelKey = `${guildName}_${username}_${userId}_level`;
        const levelRolesKey = `${guildName}_${guildId}`;

        // Get level data
        let userData = await db.levels.get(levelKey) || { xp: 0, level: 1 };

        // Generate XP and update
        const xpGain = Math.floor(Math.random() * 11) + 5;
        userData.xp += xpGain;

        const xpForNextLevel = userData.level * 350;

        if (userData.xp >= xpForNextLevel) {
            userData.xp -= xpForNextLevel;
            userData.level += 1;

            // Announce level up
            message.channel.send(
                `🎉 **Congratulations ${author}!**\nYou've leveled up to level **${userData.level}**!`
            );
        }

        // Save updated XP/Level
        await db.levels.set(levelKey, userData);

        // Retrieve level role milestones from DB
        const levelRoles = await db.levelroles.get(levelRolesKey) || {};
        const currentLevel = userData.level;

        try {
            const userRoles = member.roles.cache;

            // Get highest milestone role the user qualifies for
            const milestoneRoleId = Object.entries(levelRoles)
                .filter(([level]) => currentLevel >= parseInt(level))
                .map(([, roleId]) => roleId)
                .pop();

            // Remove all milestone roles that shouldn't be held
            for (const [, roleId] of Object.entries(levelRoles)) {
                if (roleId !== milestoneRoleId && userRoles.has(roleId)) {
                    await member.roles.remove(roleId);
                }
            }

            // Add the correct milestone role if needed
            if (milestoneRoleId && !userRoles.has(milestoneRoleId)) {
                const role = guild.roles.cache.get(milestoneRoleId);
                if (role) await member.roles.add(role);
            }

        } catch (err) {
            console.error(`Failed to update roles for ${author.tag}:`, err);
        }
    }
};
