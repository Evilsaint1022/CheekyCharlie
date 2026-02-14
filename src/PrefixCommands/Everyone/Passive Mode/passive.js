const db = require('../../../Handlers/database'); // adjust if needed

module.exports = {
  name: 'passive',
  description: 'Toggle passive mode',

  async execute(message) {

    const userId = message.author.id;

    // Get current passive data
    let userData = await db.passive.get(userId);

    // If user not in DB yet
    if (!userData) {
      userData = { passive: false };
    }

    // Toggle passive
    const newStatus = !userData.passive;

    // Save to database
    await db.passive.set(userId, {
      passive: newStatus
    });

    message.reply(
      `🛡️ Passive mode is now **${newStatus ? 'ENABLED' : 'DISABLED'}**.`
    );
  }
};
