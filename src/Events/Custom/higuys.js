module.exports = {
    name: 'messageCreate',
  
    async execute(message) {

      // Ignore bot messages
       if (message.author.bot) return;
       if (message.webhookId) return;
  
      // Convert message to lowercase for case-insensitive match
      const content = message.content.toLowerCase();
  
      // Check if it contains "hi guys" anywhere
      if (content.includes('hi guys')) {

      try {
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 🔍 Re-fetch the message to ensure it still exists
        const fetchedMessage = await message.channel.messages.fetch(message.id).catch(() => null);
        if (!fetchedMessage) return; // Message was deleted

        const links = [
          'https://higuys.enducube.net/',
          'https://higuys.enducube.net/fancy',
          'https://higuys.enducube.net/oat',
        ];
  
        // Select a random link from the list
        const randomLink = links[Math.floor(Math.random() * links.length)];
  
        console.log(`[👋] [HI GUYS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Sent "Hi Guys" in ${message.channel.name} ${message.channel.id}`);

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
  