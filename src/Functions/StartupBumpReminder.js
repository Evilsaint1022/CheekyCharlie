const db = require("../Handlers/database");

async function runStartupBumpReminder(client) {
  try {
    const allConfigs = Object.entries(await db.bump.all()); // Fix here

    for (const [key, value] of allConfigs) {
      const { channelId, roleId } = value;

      const guildId = key.split('_').pop();
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;

      const guildKey = `${guild.name}_${guild.id}`;
      const cooldownKey = guildKey;

      const lastBump = await db.lastbump.get(cooldownKey);
      if (!lastBump) continue;

      const bumpCooldown = await db.bumpcooldown.get(cooldownKey);
      const reminderDelay = bumpCooldown ?? 2 * 60 * 60 * 1000; // 2 hours

      const timePassed = Date.now() - lastBump;
      const timeLeft = reminderDelay - timePassed;

      const runReminder = async () => {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel) {
            await channel.send(`<@&${roleId}>\n**It's time to bump the server again! ❤️**`);
            console.log(`[⬆️] [BUMP] Startup reminder sent in ${channel.guild.name}`);
          }
        } catch (err) {
          console.error(`[⬆️] [BUMP] Failed to send startup reminder:`, err);
        }
      };

      const MAX_TIMEOUT = 2_147_483_647;

    if (timeLeft <= 0) {
    await runReminder();
    } else {
    setTimeout(runReminder, Math.min(timeLeft, MAX_TIMEOUT));
    }

    }
  } catch (err) {
    console.error(`[⬆️] [BUMP] Error during startup bump sync:`, err);
  }
}

module.exports = { runStartupBumpReminder };
