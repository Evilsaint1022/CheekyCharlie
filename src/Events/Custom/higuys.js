module.exports = {
    name: 'messageCreate',
  
    async execute(message) {
      // Ignore bot messages
      if (message.author.bot) return;
  
      // Convert message to lowercase for case-insensitive match
      const content = message.content.toLowerCase();
  
      // Check if it contains "hi guys" anywhere
      if (content.includes('hi guys')) {
        const links = [
          'https://higuys.enducube.net/',
          'https://higuys.enducube.net/fancy',
          'https://higuys.enducube.net/oat',
        ];
  
        // Select a random link from the list
        const randomLink = links[Math.floor(Math.random() * links.length)];
  
        try {
          await message.channel.send(randomLink);
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      }
    }
  };
  