const { Events } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
  name: Events.MessageCreate,

  /**
   * @param {Message} message
   * @param {Client} client
   */
    async execute(message, client) {
        if (message.author.bot) return;

        if (!message.channel.isDMBased()) return;

        const applications = await db.staff_app_applications.get('applications') || [];
        const activeApplication = applications.find(app =>
            app.userId === message.author.id && (app.status === 'in_progress' || app.status === 'pending')
        );

        if ( activeApplication ) {
            return;
        }

    },
};
