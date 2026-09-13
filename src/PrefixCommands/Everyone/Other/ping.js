// ping.js --------------------------------------------------------------------------------------------------------------------------------
const { EmbedBuilder } = require('discord.js');

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

    const embed = new EmbedBuilder()
      .setColor(0x207e37)
      .setTitle(`***🏓\`Ping Pong!\`***`)
      .setDescription(`**Latency: \`${latency}ms.\`**`)
      .setThumbnail(message.guild.iconURL())

    // Edit message with embed
    await sentMessage.edit({ embeds: [embed], content: '' });

    // Console Logs
    console.log(
      `[🌿] [PING] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${guildName} ${guildId} ${message.author.username} used the ping command.`
    );
  },
};
