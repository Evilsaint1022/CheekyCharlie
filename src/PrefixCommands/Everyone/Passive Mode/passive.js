const db = require('../../../Handlers/database'); // adjust if needed

module.exports = {
  name: 'passive',
  description: 'Toggle passive mode',

  async execute(message) {

    const userId = message.author.id;
    const username = message.author.username;

    // Command Cooldown check
    const commandcooldown = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const lastUsed = await db.cooldowns.get(`${userId}.lastpassive`);

    if (now - lastUsed < commandcooldown) {
      const timeLeft = commandcooldown - (now - lastUsed);

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      return message.reply(
        `⏳ Hold up! You can use passive again in **${hours}h ${minutes}m ${seconds}s**.`
      );
    }

    // Get current passive data
    let userData = await db.passive.get(userId);

    // If user not in DB yet
    if (!userData) {
      userData = { passive: true };
    }

    // Toggle passive
    const newStatus = !userData.passive;

    // Update cooldown
    await db.cooldowns.set(`${userId}.lastpassive`, now);

    // Save to database
    await db.passive.set(userId, {
      passive: newStatus
    });

    console.log(
      `[🌿] [PASSIVE] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${message.guild.name} ${message.guild.id} ${username} has set passive mode to ${newStatus ? 'ENABLED' : 'DISABLED'}.`
    );

    message.reply(
      `🛡️ Passive mode is now **${newStatus ? 'ENABLED' : 'DISABLED'}**.`
    );
  }
};
