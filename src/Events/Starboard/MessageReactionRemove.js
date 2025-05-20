const { Events } = require('discord.js');
const updateStarboard = require('./updateStarboard');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Failed to fetch reaction:', error);
        return;
      }
    }

    if (user.bot) return;
    await updateStarboard(reaction);
  }
};
