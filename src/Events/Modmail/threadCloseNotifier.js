const { Events, ThreadChannel, Client } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
  name: Events.ThreadUpdate,

  /**
   * @param {ThreadChannel} oldThread
   * @param {ThreadChannel} newThread
   * @param {Client} client
   */
  async execute(oldThread, newThread, client) {
    // Only care if the thread just got locked
    if (!oldThread.locked && newThread.locked) {
      const modMailChannelId = await db.settings.get("modmailChannelId");
      if (newThread.parentId !== modMailChannelId) return;

      const match = newThread.name.match(/\((\d+)\)$/); // Extract user ID from thread name
      if (!match) return;

      const userId = match[1];
      try {
        const user = await client.users.fetch(userId);
        if (!user) return;

        await user.send("📪 Your modmail thread has been closed. You can message again if you need further help.");
      } catch (err) {
        console.error("Failed to DM user about thread closure:", err);
      }
    }
  },
};
