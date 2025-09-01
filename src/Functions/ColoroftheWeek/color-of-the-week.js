const db = require('../../Handlers/database'); // Adjust if needed

const colors = [
0xe042f5, // Tūī Bloom
0xf542dd, // Southern Lights
0xd142f5, // Wairua Whisper
0xba42f5, // Waitomo Lights
0xa042f5, // Te Papa Glow
0x8a42f5, // Jacaranda Drift
0x4287f5, // Aoraki Dusk
0x6854ff, // Fiordland Twilight
0x42a6f5, // Lake Tekapo
0x42c7f5, // Kaikōura Coast
0x42e3f5, // Tasman Tide
0x42f5da, // Milford Mist
0x6ff5a2, // Pounamu Shine
0x9af542, // Fernlight Green
0xbff542, // Manuka Grove
0xd8f542, // Kawakawa Leaf
0xffeb33, // Lemon Waiheke
0xffd633, // Golden Kiwi
0xffc233, // Taranaki Gold
0xffad33, // Napier Citrus
0xff994d, // Kūmara Spice
0xff8566, // Rotorua Sunset
0xff7373, // Kākāriki Berry
0xff5f5f, // Pōhutukawa Bloom
0xff4b4b, // Tāmaki Blaze
];

const CHANGE_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 1 week in ms

async function changeCotwColors(client) {
  const now = Date.now();

  for (const [guildId, guild] of client.guilds.cache) {
    const guildKey = `${guild.name}_${guildId}`;

    const settings = await db.settings.get(guildKey);
    if (!settings) continue;
    const roleId = settings.cotw;
    if (!roleId) continue;

    const role = guild.roles.cache.get(roleId);
    if (!role) continue;

    // Get previous color data and lastChangeTime from db.coloroftheweek
    let colorData = await db.coloroftheweek.get(guildKey) || {};
    const previousColor = colorData.currentColor || null;
    const lastChangeTime = colorData.lastChangeTime;

    // Check if time has passed OR lastChangeTime is undefined/null
    if (lastChangeTime && now - lastChangeTime < CHANGE_INTERVAL) {
      continue; // Skip this guild if not enough time has passed
    }

    // Pick a random color that is NOT the previous one (if possible)
    let newColor;
    do {
      newColor = colors[Math.floor(Math.random() * colors.length)];
    } while (colors.length > 1 && newColor === previousColor);

    try {
      await role.setColor(newColor);
      console.log(`[COTW] Updated color for role '${role.name}' in guild '${guild.name}'`);

      // Save the colors and update lastChangeTime
      await db.coloroftheweek.set(guildKey, {
        previousColor: previousColor,
        currentColor: newColor,
        lastChangeTime: now,
      });
    } catch (err) {
      console.error(`[COTW] Failed to change color in '${guild.name}':`, err.message);
    }
  }
}

module.exports = async function (client) {
  async function scheduleNextRun() {
    const now = Date.now();

    // Find the shortest wait time among all guilds
    let nextRunDelay = CHANGE_INTERVAL; // Default full interval

    for (const [guildId, guild] of client.guilds.cache) {
      const guildKey = `${guild.name}_${guildId}`;
      const colorData = await db.coloroftheweek.get(guildKey);
      if (!colorData || !colorData.lastChangeTime) {
        nextRunDelay = 0; // Run immediately if never set
        break;
      }
      const elapsed = now - colorData.lastChangeTime;
      const remaining = Math.max(0, CHANGE_INTERVAL - elapsed);
      if (remaining < nextRunDelay) {
        nextRunDelay = remaining;
      }
    }

    // Schedule the run
    setTimeout(async () => {
      await changeCotwColors(client);
      scheduleNextRun(); // Reschedule for the following week
    }, nextRunDelay);
  }

  // Run scheduler
  scheduleNextRun();
};
