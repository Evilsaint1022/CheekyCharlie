const db = require('../../../Handlers/database'); // adjust if needed

module.exports = {
  name: 'passive',
  description: 'Toggle passive mode',

  async execute(message) {

    const userId = message.author.id;
    const username = message.author.username;

    // Get current passive data
    let userData = await db.passive.get(userId);

    // If user not in DB yet
    if (!userData) {
      userData = { passive: true };
    }

    // Toggle passive
    const newStatus = !userData.passive;

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
