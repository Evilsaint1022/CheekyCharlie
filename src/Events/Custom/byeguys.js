module.exports = {
  name: 'messageCreate',

  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Convert message to lowercase for case-insensitive match
    const content = message.content.toLowerCase();

    // Check if it contains "bye guys" anywhere
    if (content.includes('bye guys')) {
      const links = [
        'https://higuys.enducube.net/evil',
        'https://higuys.enducube.net/boat',
      ];

      // Select a random link from the list
      const randomLink = links[Math.floor(Math.random() * links.length)];

      try {
        await message.channel.send(randomLink);
      } catch (error) {
        // Ignore Error: Unknown Emoji
        if (err.code !== 10014) return;
        if (err.code !== 30010) return;
        if (err.code !== 98881) return;
        console.error('Failed to send message:', error);
      }
    }
  }
};
