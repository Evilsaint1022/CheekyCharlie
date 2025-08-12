const { Events } = require('discord.js');
const db = require('../../Handlers/database');

// Prevent race conditions with a lock per guild
const processingLocks = new Set();

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guild = message.guild;
    const guildKey = `${guild.name}_${guild.id}`;
    const currentChannelId = message.channel.id;

    // Exit early if already processing
    if (processingLocks.has(guildKey)) return;
    processingLocks.add(guildKey);

    try {
      const guildSettings = await db.settings.get(guildKey);
      const countingChannelId = guildSettings?.counting_channel;
      if (!countingChannelId || currentChannelId !== countingChannelId) return;

      const emojiData = await db.countingemojis.get(guildKey) || {};
      const CORRECT_EMOJI = emojiData.correct_emoji || "✅";
      const WRONG_EMOJI = emojiData.wrong_emoji || "❌";

      const countData = await db.counting.get(guildKey) || {
        current: 0,
        expected: 1,
        lastUserId: null
      };

      const userNumber = parseInt(message.content.trim());
      if (isNaN(userNumber) || message.content.trim() !== userNumber.toString()) return;

      // ❌ Same user sent a message twice — reset the count!
      if (message.author.id === countData.lastUserId) {
        await message.react(WRONG_EMOJI).catch(() => null);

        await message.reply({
          content: `${WRONG_EMOJI} **${message.author.username}** counted twice in a row and ruined the count at **${countData.current}**! Start again from **1**.`,
          allowedMentions: { repliedUser: true }
        }).catch(() => null);

        await db.counting.set(guildKey, {
          current: 0,
          expected: 1,
          lastUserId: null
        });

        console.log(`[Counting] User counted twice in a row. Last user was ${countData.lastUserId}, this time it was ${message.author.id}.`)

        return;
      }

      // ✅ Correct number
      const isCorrect = userNumber === countData.expected;

      if (!isCorrect) {
        await message.react(WRONG_EMOJI).catch(() => null);

        await message.reply({
          content: `${WRONG_EMOJI} **${message.author.username}** ruined the count at **${countData.current}**! Start again from **1**.`,
          allowedMentions: { repliedUser: true }
        }).catch(() => null);

        await db.counting.set(guildKey, {
          current: 0,
          expected: 1,
          lastUserId: null
        });

        console.log(`[Counting] User (${message.author.id}): Send ${userNumber}, but ${countData.expected} was expected. Runined: start at 1.`)

      } else {
        await message.react(CORRECT_EMOJI).catch(() => null);

        await db.counting.set(guildKey, {
          current: userNumber,
          expected: userNumber + 1,
          lastUserId: message.author.id
        });

        console.log(`[Counting] User (${message.author.id}): From ${userNumber - 1} to ${userNumber}. Expected: ${userNumber + 1}`)
      }

    } finally {
      processingLocks.delete(guildKey);
    }
  }
};
