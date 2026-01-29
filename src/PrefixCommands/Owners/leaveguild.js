const db = require('../../Handlers/database');

module.exports = {
  name: 'leaveguild',
  description: 'Force the bot to leave a server (Owner only)',
  async execute(message, args, client) {

    const userId = message.author.id;

    // 🔐 Fetch owners from DB (ASYNC)
    const owners = await db.owners.get('CheekyCharlie_Owners');

    if (!Array.isArray(owners)) {
      console.error('Owners list broken:', owners);
      return message.reply('⚠️ Owner list is misconfigured.');
    }

    if (!owners.includes(userId)) {
      return message.reply('🚫 You do not have permission to use this command.');
    }

    // ❌ No guild ID provided
    const guildId = args[0];
    if (!guildId) {
      return message.reply('❓ You need to provide a server ID.');
    }

    // 🔍 Find the guild
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return message.reply('❌ I am not in a server with that ID.');
    }

    try {
      await guild.leave();
      message.reply(`👋 Successfully left **${guild.name}** (\`${guild.id}\`)`);
    } catch (err) {
      console.error(err);
      message.reply('⚠️ Failed to leave the server. Check permissions.');
    }
  }
};
