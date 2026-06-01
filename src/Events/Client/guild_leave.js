const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild, client) {

    console.log("[-]");
    console.log("[-] Cheeky Charlie left a server!");
    console.log("[-] -> Server name: " + guild.name);
    console.log("[-] -> ID: " + guild.id);
    console.log("[-]");

    const bot_channel_ID = await db.default.get("Default.bot_updates_channel");

    if (!bot_channel_ID) return;

    const leftEmbed = {
      color: 0xff4d4d,
      title: '**Cheeky Charlie left a server!**',
      description: `**Server: ${guild.name}**\nID: \`${guild.id}\``
    };

    const four_square_server_ID = await db.default.get("Default.four_square_server");

    if (!four_square_server_ID) return;

    console.log("Four Square Server ID:", four_square_server_ID);

    let FourSquareServer;

    try {
      FourSquareServer = await client.guilds.fetch(four_square_server_ID);
    } catch (error) {
      console.error(
        `Failed to fetch guild ${four_square_server_ID}:`,
        error.message
      );
      return;
    }

    if (!FourSquareServer) return;

    const channel = FourSquareServer.channels.cache.get(bot_channel_ID);

    if (!channel || !bot_channel_ID) return;

    channel.send({ embeds: [leftEmbed] });

  },
};