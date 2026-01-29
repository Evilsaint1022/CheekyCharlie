const { EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: 'servers',
  description: 'Lists all servers CheekyCharlie is in',
  async execute(message, args, client) {

    const userId = message.author.id;

    // ✅ AWAIT the DB read
    const owners = await db.owners.get('CheekyCharlie_Owners');

    // Hard safety check
    if (!Array.isArray(owners)) {
      console.error('Owners is not an array:', owners);
      return message.reply('⚠️ Owner list is broken. Check the database.');
    }

    // Owner-only check
    if (!owners.includes(userId)) {
      return message.reply('🚫 You do not have permission to view the server list!');
    }

    const guildList = client.guilds.cache.map(
      guild => `**${guild.name}** — \`${guild.id}\``
    );

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`🌍 CheekyCharlie Servers (${guildList.length})`)
      .setDescription(guildList.join('\n').slice(0, 4096))
      .setFooter({ text: 'CheekyCharlie • Server List' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
