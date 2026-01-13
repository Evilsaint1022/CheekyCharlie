const { Events, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Match :CharacterName: Message
    const match = message.content.match(/^:([^:]+):\s*(.+)/);
    if (!match) return;

    const guildName = message.guild.name;
    const guildId = message.guild.id;

    const characterName = match[1].trim().toLowerCase();
    const text = match[2].trim();
    if (!text) return;

    try {
      const res = await fetch('https://thesimpsonsapi.com/api/characters');
      const data = await res.json();

      const characters = data.results;
      if (!Array.isArray(characters)) return;

      const character = characters.find(c =>
        c.name.toLowerCase().startsWith(characterName)
      );

      if (!character) return;

      // ✅ Thumbnail URL from CDN
      const thumbnail = `https://cdn.thesimpsonsapi.com/500/character/${character.id}.webp`;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: character.name,
          iconURL: character.image
        })
        .setThumbnail(thumbnail)
        .setDescription(text)
        .setColor(0xF9E547)
        .setFooter({ text: '💛 The Simpsons Roleplay' });

      await message.channel.send({ embeds: [embed] });

      console.log(`[💛] [SIMPSONS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.username} - ${characterName}:${text}`);

      if (message.deletable) {
        await message.delete();
      }

    } catch (err) {
      console.error('Simpsons RP Error:', err);
    }
  }
};
