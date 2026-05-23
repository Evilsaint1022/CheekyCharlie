// auto_kick.js
const { Events } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {

    console.log("[+]");
    console.log("[+] Cheeky Charlie joined a new server!");
    console.log("[+] -> Server name: " + guild.name);
    console.log("[+] -> ID: " + guild.id);
    console.log("[+]");
    
    const bot_channel_ID = await db.default.get("Default.bot_updates_channel");

    if ( !bot_channel_ID ) return;

    const joinedEmbed = {
            color: 0x759eff,
            title: '**Cheeky Charlie joined a new server!**',
            description: `**Server: ${guild.name}**\nID: \`${guild.id}\``
    };

    const four_square_server_ID = await db.default.get("Default.four_square_server");

    if ( !four_square_server_ID ) return;

    const FourSquareServer = await client.guilds.fetch(four_square_server_ID);

    if ( !four_square_server_ID ) return;

    const channel = await FourSquareServer.channels.cache.get(bot_channel_ID);

    if ( !channel || !FourSquareServer || !bot_channel_ID ) return;

    channel.send({embeds: [joinedEmbed]});

  },
};
