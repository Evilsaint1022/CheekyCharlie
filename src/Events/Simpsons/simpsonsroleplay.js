const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Match :CharacterName: Message
    const match = message.content.match(/^:([^:]+):\s*(.+)/);
    if (!match) return;

    const characterNameInput = match[1].trim().toLowerCase();
    const text = match[2].trim();
    if (!text) return;

    try {
      const res = await fetch('https://thesimpsonsapi.com/api/characters');
      const data = await res.json();
      const characters = data.results;

      if (!Array.isArray(characters)) return;

      const character = characters.find(c =>
        c.name.toLowerCase().startsWith(characterNameInput)
      );

      if (!character) return;

      // Character thumbnail
      const thumbnail = `https://cdn.thesimpsonsapi.com/500/character/${character.id}.webp`;

      const embed = new EmbedBuilder()
        .setDescription(`${text}\n\n`)
        .setColor(0xF9E547)
        .setFooter({ text: '💛 The Simpsons Roleplay' });

      // 🔎 Find or create webhook
      let webhook;
      const webhooks = await message.channel.fetchWebhooks();
      webhook = webhooks.find(w => w.name === 'Simpsons RP');

      if (!webhook) {
        if (
          !message.guild.members.me.permissions.has(
            PermissionsBitField.Flags.ManageWebhooks
          )
        ) return;

        webhook = await message.channel.createWebhook({
          name: 'Simpsons RP',
        });
      }

      // 📤 Send message as webhook
      await webhook.send({
        username: character.name,
        avatarURL: thumbnail,
        embeds: [embed],
      });

      // 🧹 Delete original message
      if (message.deletable) {
        await message.delete();
      }

      console.log(
        `[💛] [SIMPSONS] ${message.guild.name} (${message.guild.id}) ` +
        `${message.author.username} -> ${character.name}: ${text}`
      );

    } catch (err) {
      console.error('Simpsons RP Webhook Error:', err);
    }
  }
};
