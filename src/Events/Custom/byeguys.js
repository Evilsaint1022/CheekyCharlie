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
        console.log(`[👋] [BYE GUYS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} - Sent "Bye Guys" in ${message.channel.name} ${message.channel.id}`);
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
