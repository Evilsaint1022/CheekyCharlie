const axios = require('axios');

const dogApiKey = process.env.DOG_API_KEY;

module.exports = {
    name: 'dog',
    description: 'Get a random dog image from The Dog API',
  async execute(message) {

  // Prevent command usage in DMs
    if (message.channel.isDMBased()) return;// Prevent command usage in DMs
        if (message.channel.isDMBased()) {
        return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

    const guildName = message.guild.name;
    const guildId = message.guild.id;
    const username = message.author.username;

    try {
      const { data } = await axios.get('https://api.thedogapi.com/v1/images/search', {
        headers: { 'x-api-key': dogApiKey },
      });

      const dogImageUrl = data[0].url;
      const messageContent = `Here's a random dog for you! 🐶\n${dogImageUrl}`;

      await message.reply({ content: messageContent });

      // Console Logs
      console.log(`[🌿] [DOG] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${username} used the dog command.`);
    } catch (error) {
      console.error(error);
    }
  },
};

