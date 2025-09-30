const axios = require('axios');

const catApiKey = process.env.CAT_API_KEY;

module.exports = {
  data: {
    name: 'cat',
    description: 'Get a random cat image from The Cat API',
  },
  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

    const guildName = interaction.guild.name;
    const guildId = interaction.guild.id;

    const { data } = await axios.get('https://api.thecatapi.com/v1/images/search', {
      headers: {
        'x-api-key': catApiKey,
      },
    });

    const catImageUrl = data[0].url;
    const messageContent = `Here's a random cat for you! 😺\n${catImageUrl}`;

    await interaction.reply({ content: messageContent });

      // Console Logs
  console.log(`[CAT] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the cat command.`)
  },
};

