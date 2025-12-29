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

    // Construct the settings key for the guild
    const settingsKey = `${guildId}`;

    let guildSettings;
    try {
      guildSettings = await db.settings.get(settingsKey);
    } catch (err) {
      console.error(`Failed to retrieve settings for guild ${settingsKey}:`, err);
      return;
    }

    // Exit early if the settings object or VerifiedRole field is missing
    if (!guildSettings || !guildSettings.VerifiedRole) return;

    const verifiedRoleId = guildSettings.VerifiedRole;

    // Set a timeout to check the member's role after 10 minutes
    setTimeout(async () => {
      try {
        if (!member.roles.cache.has(verifiedRoleId)) {
          await member.kick("Didn't Verify Quick Enough!");
          console.log(`[❌] [AUTO KICK] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} Kicked ${member.user.tag} Didn't Verify Quick Enough!`);
        }
      } catch (error) {
        console.error(`Failed to kick ${member.user.tag}:`, error);
      }
    }, checkTime);
  },
};
