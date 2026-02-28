// ping.js --------------------------------------------------------------------------------------------------------------------------------

module.exports = {
  name: 'ping',
  aliases: [],

  async execute(message, args) {

    // Prevent command usage in DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guildName = message.guild.name;
    const guildId = message.guild.id;

    const start = Date.now();

    // Initial response
    const sentMessage = await message.channel.send('Pinging...');

    const latency = Date.now() - start;

    const pingEmbed = {
      color: 0x207e37,
      title: '**Pong!**',
      description: `**Latency: ${latency}ms.**`,
    };

    // Add guild icon thumbnail if available
    if (message.guild.iconURL()) {
      pingEmbed.thumbnail = {
        url: message.guild.iconURL({ dynamic: true, size: 128 }),
      };
    }

    // Edit message with embed
    await sentMessage.edit({ embeds: [pingEmbed], content: '' });

    // Console Logs
    console.log(
      `[🌿] [PING] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${guildName} ${guildId} ${message.author.username} used the ping command.`
    );
  },
};
