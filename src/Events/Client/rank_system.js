const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || message.channel.isDMBased()) return;

    const { guild, member, author } = message;
    const guildKey = `${guild.name}_${guild.id}`;
    const userKey = `${author.username}_${author.id}`;

    // Load the guild's full leaderboard object
    let guildData = await db.levels.get(guildKey) || {};

    // Get or create this user's data
    let userData = guildData[userKey] || { xp: 0, level: 1 };

    // Generate XP
    const xpGain = Math.floor(Math.random() * 11) + 5;
    userData.xp += xpGain;

    const xpForNextLevel = userData.level * 350;
    if (userData.xp >= xpForNextLevel) {
      userData.xp -= xpForNextLevel;
      userData.level += 1;
      message.channel.send(`🎉 **Congratulations ${author}!** You've leveled up to level **${userData.level}**!`);
    }

    // Save back into guildData and store
    guildData[userKey] = userData;
    await db.levels.set(guildKey, guildData);

    // Manage level roles
    const levelRoles = await db.levelroles.get(guildKey) || {};
    const currentLevel = userData.level;
    try {
      const userRoles = member.roles.cache;
      const milestoneRoleId = Object.entries(levelRoles)
        .filter(([level]) => currentLevel >= parseInt(level))
        .map(([, roleId]) => roleId)
        .pop();

      for (const [, roleId] of Object.entries(levelRoles)) {
        if (roleId !== milestoneRoleId && userRoles.has(roleId)) {
          await member.roles.remove(roleId);
        }
      }

      if (milestoneRoleId && !userRoles.has(milestoneRoleId)) {
        const role = guild.roles.cache.get(milestoneRoleId);
        if (role) await member.roles.add(role);
      }
    } catch (err) {
      console.error(`Failed to update roles for ${author.tag}:`, err);
    }
  }
};
