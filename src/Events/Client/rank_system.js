const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || message.channel.isDMBased()) return;

    const { guild, member, author } = message;
    const guildKey = `${guild.name}_${guild.id}`;
    const userKey = `${author.username}_${author.id}`;

    // Check if levels feature is enabled for this guild
    const levelsSetting = await db.settings.get(guildKey);
    if (!levelsSetting || levelsSetting.levels !== true) {
      return;
    }

    // Load guild XP/level data
    let guildData = await db.levels.get(guildKey) || {};
    let userData = guildData[userKey] || { xp: 0, level: 1 };

    // Load guild settings for LevelChannel
    const settings = await db.settings.get(guildKey);
    const levelChannelId = settings?.LevelChannel;
    const levelChannel = levelChannelId ? guild.channels.cache.get(levelChannelId) : null;

    // XP gain
    const xpGain = Math.floor(Math.random() * 11) + 5;
    userData.xp += xpGain;

    const xpForNextLevel = userData.level * 350;
    if (userData.xp >= xpForNextLevel) {
      userData.xp -= xpForNextLevel;
      userData.level += 1;

      const levelMessage = `🎉 **Congratulations ${author}!**🎉\n**You've leveled up to level ${userData.level}**!`;

      if (levelChannel) {
        levelChannel.send(levelMessage).catch(console.error);
      } else {
        message.channel.send(levelMessage).catch(console.error);
      }
    }

    // Save updated user data
    guildData[userKey] = userData;
    await db.levels.set(guildKey, guildData);

    // Load level roles config
    const levelRoles = await db.levelroles.get(guildKey) || {};
    const currentLevel = userData.level;

    try {
      const rolesToKeep = new Set(); // Sticky roles or latest earned role
      let highestUnlocked = 0;
      let highestRoleId = null;

      // Iterate and find roles to keep or assign
      for (const [levelStr, config] of Object.entries(levelRoles)) {
        const level = parseInt(levelStr);
        if (currentLevel >= level) {
          const { roleId, sticky } = config;

          if (sticky) {
            rolesToKeep.add(roleId);
          }

          if (level > highestUnlocked) {
            highestUnlocked = level;
            highestRoleId = roleId;
          }
        }
      }

      if (highestRoleId) rolesToKeep.add(highestRoleId);

      // Manage roles
      const userRoles = member.roles.cache;
      for (const role of userRoles.values()) {
        if (
          Object.values(levelRoles).some(lr => lr.roleId === role.id) &&
          !rolesToKeep.has(role.id)
        ) {
          await member.roles.remove(role.id).catch(console.error);
        }
      }

      // Add missing roles
      for (const roleId of rolesToKeep) {
        if (!userRoles.has(roleId)) {
          const role = guild.roles.cache.get(roleId);
          if (role) await member.roles.add(role).catch(console.error);
        }
      }

    } catch (err) {
      console.error(`Failed to update roles for ${author.tag}:`, err);
    }
  }
};
