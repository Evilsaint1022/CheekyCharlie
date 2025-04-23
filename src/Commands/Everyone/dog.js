const axios = require('axios');

const dogApiKey = process.env.DOG_API_KEY;

module.exports = {
  data: {
    name: 'dog',
    description: 'Get a random dog image from The Dog API',
  },
  async execute(interaction) {
    const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
    try {
      const { data } = await axios.get('https://api.thedogapi.com/v1/images/search', {
        headers: { 'x-api-key': dogApiKey },
      });

      const dogImageUrl = data[0].url;
      const messageContent = `Here's a random dog for you! 🐶\n${dogImageUrl}`;

      await interaction.reply({ content: messageContent });

      // Console Logs
      console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the dog command.`);
    } catch (error) {
      console.error(error);
    }
  },
};

