const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'emoji',
  aliases: ['e'],

  async execute(message, args) {
    // ❌ Prevent usage in DMs (optional, but consistent with your other commands)
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const input = args.join(' ');

    if (!input) {
      return message.reply('❌ You must provide a custom emoji.');
    }

    // CUSTOM EMOJI FORMAT CHECK
    // Matches: <:name:123456789> or <a:name:123456789>
    const match = input.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);

    if (!match) {
      return message.reply(
        '❌ Only **custom Discord emojis** are allowed. Built-in emojis like 😀 or ❄️ are blocked.'
      );
    }

    const emojiName = match[1];
    const emojiId = match[2];
    const isAnimated = input.startsWith('<a:');

    // DIRECT DISCORD CDN URL
    const imageURL = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?quality=lossless`;

    console.log(
      `[🌿] [EMOJI] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${message.guild.name} ${message.guild.id} ${message.author.username} used the emoji command to get ${emojiName} ${emojiId}`
    );

    const embed = new EmbedBuilder()
      .setTitle('🌿**__Here is the following emoji:__**')
      .setDescription(`Emoji Name: ${emojiName}\nEmoji ID: ${emojiId}`)
      .setImage(imageURL)
      .setColor(0x207e37);

    await message.channel.send({ embeds: [embed] });
  }
};
