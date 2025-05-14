const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const targetBotId = '302050872383242240'; // Replace with the bot ID you want to listen to
    const targetChannelId = '1351015320797843517'; // Replace with the target channel ID

    // Ignore messages that aren't from the target bot in the target channel
    if (message.author.id !== targetBotId) return;
    if (message.channel.id !== targetChannelId) return;

    try {
      // Send an instant response
      await message.channel.send(`Bot ${message.author.username} just sent a message!`);
    } catch (error) {
      console.error('Failed to send instant response:', error);
    }
  },
};
