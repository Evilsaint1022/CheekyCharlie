const { Events } = require('discord.js');
const db = require('../../Handlers/database');

// Prevent race conditions with a lock per guild
const processingLocks = new Set();

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot || !message.guild) return;
    const username = message.author.username;
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

      let userNumber = parseInt(message.content.trim());
      let userMessage = message.content.trim()
      const userMsg_not_IsNumber = isNaN(userMessage)
      let wasCalculated = false;

      if (userMsg_not_IsNumber) {
        
        try {
          const mathResult = eval(userMessage);
          userNumber = mathResult;
          wasCalculated = true;
        } catch (e) {}
      }

      if (isNaN(userNumber) || (!wasCalculated && message.content.trim() !== userNumber.toString())) return;

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

        console.log(`[Counting] ${guildKey} (${username}): counted twice in a row. Last user was ${countData.lastUserId}, this time it was ${message.author.id}.`)

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

        console.log(`[Counting] ${guildKey} (${username}): Send ${userNumber}, but ${countData.expected} was expected. Runined: start at 1.`)

      } else {
        await message.react(CORRECT_EMOJI).catch(() => null);

        if (wasCalculated) {

          for ( const number of userNumber.toString() ) {

            if (number === "0") message.react("0️⃣");
            else if (number === "1") message.react("1️⃣");
            else if (number === "2") message.react("2️⃣");
            else if (number === "3") message.react("3️⃣");
            else if (number === "4") message.react("4️⃣");
            else if (number === "5") message.react("5️⃣");
            else if (number === "6") message.react("6️⃣");
            else if (number === "7") message.react("7️⃣");
            else if (number === "8") message.react("8️⃣");
            else if (number === "9") message.react("9️⃣");

          }

        }

        await db.counting.set(guildKey, {
          current: userNumber,
          expected: userNumber + 1,
          lastUserId: message.author.id
        });

        console.log(`[Counting] ${guildKey} (${username}): From ${userNumber - 1} to ${userNumber}. Next Expected: ${userNumber + 1}`)
      }

    } finally {
      processingLocks.delete(guildKey);
    }
  }
};
