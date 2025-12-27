const axios = require('axios');

const catApiKey = process.env.CAT_API_KEY;

module.exports = {
    name: 'cat',
    description: 'Get a random cat image from The Cat API',
  async execute(message, args) {

    // Prevent command usage in DMs
        if (message.channel.isDMBased()) {
        return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

    const guildName = message.guild.name;
    const guildId = message.guild.id;
    const username = message.author.username;

    const { data } = await axios.get('https://api.thecatapi.com/v1/images/search', {
      headers: {
        'x-api-key': catApiKey,
      },
    });

    const catImageUrl = data[0].url;
    const messageContent = `Here's a random cat for you! 😺\n${catImageUrl}`;

    await message.reply({ content: messageContent });

      // Console Logs
  console.log(`[🌿] [CAT] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${username} used the cat command.`)
  },
};

