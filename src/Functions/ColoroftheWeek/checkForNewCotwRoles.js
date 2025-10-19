const db = require('../../Handlers/database'); // Adjust path as needed

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

async function checkForNewCotwRoles(client) {
    
    // Check for new COTW roles
  for (const [guildId, guild] of client.guilds.cache) {
    const guildKey = `${guild.name}_${guildId}`;
    const settings = await db.settings.get(guildKey);
    if (!settings || !settings.cotw) continue;

    const roleId = settings.cotw;

    // Skip if already initialized in db.coloroftheweek
    const existingColorData = await db.coloroftheweek.get(guildKey);
    if (existingColorData && existingColorData.currentColor) continue;

    const role = guild.roles.cache.get(roleId);
    if (!role) continue;

    const newColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      await role.edit({ newColor });
      console.log(`[COTW] Assigned initial color to '${role.name}' in '${guild.name}'`);

      await db.coloroftheweek.set(guildKey, {
        previousColor: null,
        currentColor: newColor,
        lastChangeTime: Date.now(),
      });
    } catch (err) {
      console.error(`[COTW] Failed to set initial color in '${guild.name}':`, err.message);
    }
  }
}

module.exports = async function (client) {
  await checkForNewCotwRoles(client);
  setInterval(() => checkForNewCotwRoles(client), 5 * 1000); // Checks for new cotw every 5 seconds
};
