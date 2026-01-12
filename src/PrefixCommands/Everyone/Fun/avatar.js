const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'avatar',
  aliases: ['pfp'],

  async execute(message, args) {
    // ❌ Prevent usage in DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    // Get mentioned user or fallback to command author
    const user =
      message.mentions.users.first() ||
      message.client.users.cache.get(args[0]) ||
      message.author;

    const guildName = message.guild.name;
    const guildId = message.guild.id;

    // High-resolution avatar
    const avatarUrl = user.displayAvatarURL({
      dynamic: true,
      size: 1024
    });

    const avatarEmbed = new EmbedBuilder()
      .setTitle(`${user.username}'s Avatar`)
      .setImage(avatarUrl)
      .setColor(0x207e37)
      .setFooter({
        text: `Requested by ${message.author.username}`,
        iconURL: message.author.displayAvatarURL()
      })
      .setTimestamp();

    await message.channel.send({ embeds: [avatarEmbed] });

    // Console log
    console.log(
      `[🌿] [AVATAR] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${guildName} ${guildId} ${message.author.username} used the avatar command for ${user.username}'s avatar.`
    );
  }
};
