const { Events } = require('discord.js');
const db = require('../../Handlers/database');
const { wordsToNumbers } = require('words-to-numbers');

// Prevent race conditions with a lock per guild
const processingLocks = new Set();

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot || !message.guild) return;
    const username = message.author.username;
    const guild = message.guild;
    const guildKey = `${guild.id}`;
    const currentChannelId = message.channel.id;

    // Get Counting Lives for servers
    let countingLives = (await db.lives.get(`${guildKey}.lives`));
    if (countingLives === undefined) {
      await db.lives.set(`${guildKey}.lives`, 3);
    }

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
        lastUserId: null,
        record: 0
      };

      const currentRecord = Number(countData.record) || 0;

      const convertedMessage = wordsToNumbers(message.content.trim());
      let userNumber = parseInt(convertedMessage);
      let userMessage = convertedMessage.toString();

      const jsKeywords = [
          "break", "case", "catch", "class", "const", "continue", "debugger", "default",
          "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
          "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
          "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
          "yield", "let", "await", "implements", "interface", "package", "private", "protected",
          "public", "static"
      ];

      if (jsKeywords.some(keyword => userMessage.includes(keyword))) {
        return;
      }

      userMessage = userMessage.replaceAll("^", "**")

      let wasCalculated = false;

      const userMsg_not_IsNumber = isNaN(userMessage)

      if (userMsg_not_IsNumber) {

        try {
          const mathResult = eval(userMessage);
          userNumber = mathResult;
          wasCalculated = true;
        } catch (e) {}
      } else {
        userNumber = Number(userMessage);
      }

      if (isNaN(userNumber) || (!wasCalculated && convertedMessage.toString() !== userNumber.toString())) return;

      // ❌ Same user sent a message twice — reset the count!
      if (message.author.id === countData.lastUserId) {
        await message.react(WRONG_EMOJI).catch(() => null);

        // Decrease only if > 0
        if (countingLives > 0) {
          countingLives -= 1;
          await db.lives.set(`${guildKey}.lives`, countingLives);
        }

        console.log(`[❌] [COUNTING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} (${username}): Send ${userNumber}, but ${countData.expected} was expected. Lives left: ${countingLives}.`)

        await message.reply({
          content: `${WRONG_EMOJI} **${message.author.username}** counted twice in a row and lost a life! ${message.guild.name} has **${countingLives}** lives left.`,
          allowedMentions: { repliedUser: true }
        }).catch(() => null);

        // ✅ ONLY reset if lives are 0
        if (countingLives === 0) {
          console.log(`[❌] [COUNTING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} (${message.channel.name} ${message.channel.id}): Counting is restarting back at 1 again.`)
          await message.reply({ content: `**❌ Counting is Restarting back at 1 again.**` }).catch(() => null);
          await db.counting.set(guildKey, {
            current: 0,
            expected: 1,
            lastUserId: null,
            record: currentRecord
          });
        }
        return;
      }

      // ✅ Correct number
      const isCorrect = userNumber === countData.expected;

      if (!isCorrect) {
        await message.react(WRONG_EMOJI).catch(() => null);

        // Decrease only if > 0
        if (countingLives > 0) {
          countingLives -= 1;
          await db.lives.set(`${guildKey}.lives`, countingLives);
        }

        console.log(`[❌] [COUNTING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} (${username}): Send ${userNumber}, but ${countData.expected} was expected. Lives left: ${countingLives}.`)

        await message.reply({
          content: `${WRONG_EMOJI} **${message.author.username}** ruined the count at **${countData.current}**! ${message.guild.name} has **${countingLives}** lives left.`,
          allowedMentions: { repliedUser: true }
        }).catch(() => null);

        // ✅ ONLY reset if lives are 0
        if (countingLives === 0) {
          console.log(`[❌] [COUNTING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} (${message.channel.name} ${message.channel.id}): Counting is restarting back at 1 again.`)
          await message.reply({ content: `**❌ Counting is Restarting back at 1 again.**` }).catch(() => null);
          await db.counting.set(guildKey, {
            current: 0,
            expected: 1,
            lastUserId: null,
            record: currentRecord
          });
        }
      } else {

        const newRecord = userNumber > currentRecord ? userNumber : currentRecord;

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

        if ( userNumber == 100 ) {
          message.react("💯");
          message.react("🎉");
        }

        await db.counting.set(guildKey, {
          current: userNumber,
          expected: userNumber + 1,
          lastUserId: message.author.id,
          record: newRecord
        });

        console.log(`[✅] [COUNTING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} (${username}): From ${userNumber - 1} to ${userNumber}. Next Expected: ${userNumber + 1} Lives: ${countingLives}.`)
      }

    } finally {
      processingLocks.delete(guildKey);
    }
  }
};