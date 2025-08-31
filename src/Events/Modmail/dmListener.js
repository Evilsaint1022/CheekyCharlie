const { Events, Message, Client, ChannelType } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
  name: Events.MessageCreate,

  /**
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    if (message.author.bot) return;

    const modMailChannelId = await db.settings.get("modmailChannelId");
    if (!modMailChannelId) return;

    const modMailChannel = client.channels.cache.get(modMailChannelId);
    if (!modMailChannel) return;

    // === Handle incoming DM from user ===
    if (message.channel.isDMBased()) {
      try {
        const applications = (await db.staff_app_applications.get('applications')) || [];
        const hasActiveApplication = applications.some(app => app.userId === message.author.id && (app.status === 'in_progress' || app.status === 'pending'));
        if (hasActiveApplication) return;
      } catch (e) {
        console.error('Error checking staff applications for modmail gating:', e);
      }
      // Try to find existing thread that is not locked
      let thread = modMailChannel.threads.cache.find(
        (t) => t.name.includes(message.author.id) && !t.locked
      );

      // If no thread or the thread is locked, make a new one
      if (!thread) {
        try {
          thread = await modMailChannel.threads.create({
            name: `${message.author.tag} (${message.author.id})`,
            autoArchiveDuration: 60,
            reason: `Modmail thread for user ${message.author.tag}`,
            type: ChannelType.PublicThread,
          });

          await thread.send(`📬 New modmail thread started with **${message.author.tag}**`);
        } catch (error) {
          console.error("Error creating modmail thread:", error);
          return;
        }
      }

      // Forward user message to thread
      try {
        await thread.send({
          content: `📌・**${message.author.tag}**\n 📧・**Message:** ${message.content || "*No text content*"}`,
          files:
            message.attachments.size > 0
              ? Array.from(message.attachments.values()).map((a) => a.url)
              : [],
        });
      } catch (error) {
        console.error("Error sending message to modmail thread:", error);
      }

      return;
    }

    // === Handle messages from staff inside thread ===
    if (
      message.channel.isThread() &&
      message.channel.parentId === modMailChannelId &&
      !message.channel.locked
    ) {
      const match = message.channel.name.match(/\((\d+)\)$/); // Extract user ID
      if (!match) return;

      const userId = match[1];
      try {
        const user = await client.users.fetch(userId);
        if (!user) return;

        await user.send({
          content: `⭐・**${message.author.tag}**\n 📧・**Modmail:** ${message.content || "*No text content*"}`,
          files:
            message.attachments.size > 0
              ? Array.from(message.attachments.values()).map((a) => a.url)
              : [],
        });
      } catch (error) {
        console.error("Error forwarding staff message to user DM:", error);
      }
    }
  },
};
