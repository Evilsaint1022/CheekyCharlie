const { Events } = require('discord.js');
const db = require('../../Handlers/database'); // Main DB handler

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guild = message.guild;
    const guildKey = `${guild.name}_${guild.id}`;
    const currentChannelId = message.channel.id;

    // Fetch counting channel from settings
    const guildSettings = await db.settings.get(guildKey);
    const countingChannelId = guildSettings?.counting_channel;

    if (!countingChannelId || currentChannelId !== countingChannelId) return;

    // Fetch custom emojis or use defaults
    const emojiData = await db.countingemojis.get(guildKey) || {};
    const CORRECT_EMOJI = emojiData.correct_emoji || "✅";
    const WRONG_EMOJI = emojiData.wrong_emoji || "❌";

    // Fetch current count state
    const countData = await db.counting.get(guildKey) || {
      current: 0,
      expected: 1,
      lastUserId: null
    };

    // Parse message content as integer
    const userNumber = parseInt(message.content.trim());

    // Ignore if message is not a pure number
    if (isNaN(userNumber) || message.content.trim() !== userNumber.toString()) {
      return;
    }

    const isCorrect = userNumber === countData.expected;

    if (!isCorrect) {
      await message.react(WRONG_EMOJI).catch(() => null);

      await message.reply({
        content: `${WRONG_EMOJI} **${message.author.username}** ruined the count at **${countData.current}**! Start again from **1**.`,
        allowedMentions: { repliedUser: true }
      });

      await db.counting.set(guildKey, {
        current: 0,
        expected: 1,
        lastUserId: null
      });
    } else {
      await message.react(CORRECT_EMOJI).catch(() => null);

      await db.counting.set(guildKey, {
        current: userNumber,
        expected: userNumber + 1,
        lastUserId: message.author.id
      });
    }
  }
};
