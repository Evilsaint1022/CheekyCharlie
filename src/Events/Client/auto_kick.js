// auto_kick.js
const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    
    const checkTime = 10 * 60 * 1000; // 10 minutes in milliseconds
    // const checkTime = 2 * 60 * 1000; // 2 minutes in milliseconds for testing.

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
        // Re-fetch the member (critical after timeouts)
        const fetchedMember = await member.guild.members
          .fetch(member.id)
          .catch(() => null);

        // ❌ Member already left / kicked
        if (!fetchedMember) return;

        // ✅ Member verified in time
        if (fetchedMember.roles.cache.has(verifiedRoleId)) return;

        // ❌ Can't kick (permissions / role hierarchy)
        if (!fetchedMember.kickable) return;

        // Attempt the kick
        await fetchedMember.kick("Didn't Verify Quick Enough!");

        // ✅ Only logs if kick succeeded
        console.log(
          `[❌] [AUTO KICK] [${new Date().toLocaleDateString('en-GB')}] ` +
          `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
          `${guildName} ${guildId} Kicked ${fetchedMember.user.tag} Didn't Verify Quick Enough!`
        );

      } catch (error) {
        console.error(`Failed to kick ${member.user?.tag ?? member.id}:`, error);
      }
    }, checkTime);
  },
};
