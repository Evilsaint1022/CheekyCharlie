// auto_kick.js
const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const checkTime = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Ignore bots
    if (member.user.bot) return;

    const guildId = member.guild.id;
    const guildName = member.guild.name;

    // Construct the settings key
    const settingsKey = `${guildName}_${guildId}_verifiedRoleId`;

    // Retrieve the VerifiedRoleId from the database
    let verifiedRoleId;
    try {
      verifiedRoleId = await db.settings.get(settingsKey);
    } catch (err) {
      console.error(`Failed to retrieve role settings for guild ${settingsKey}:`, err);
      return;
    }

    // Exit early if VerifiedRoleId isn't set
    if (!verifiedRoleId) return;

    // Set a timeout to check the member's role after 10 minutes
    setTimeout(async () => {
      try {
        if (!member.roles.cache.has(verifiedRoleId)) {
          await member.kick("Didn't Verify Quick Enough!");
        }
      } catch (error) {
        console.error(`Failed to kick ${member.user.tag}:`, error);
      }
    }, checkTime);
  },
};
