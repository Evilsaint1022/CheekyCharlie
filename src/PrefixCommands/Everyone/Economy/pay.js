const db = require("../../../Handlers/database");

// Replace /\./g with _ when saving (legacy)
function escapeUsername(username) {
  return username.replace(/\./g, '_');
}

module.exports = {
  name: "pay",
  aliases: [],
  description: "Transfer points to another member.",

  /**
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    
    if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const ferns = '<:Ferns:1395219665638391818>';
    const sender = message.author;

    // --------------------
    // Argument parsing
    // --------------------

    const user =
      message.mentions.users.first() ||
      message.guild.members.cache.get(args[0])?.user;

    const amount = parseInt(args[1], 10);

    if (!user) {
      return message.reply("❌ Please mention a valid user.\nUsage: `!pay @user <amount>`");
    }

    if (sender.id === user.id) {
      return message.reply("❌ You cannot pay yourself!");
    }

    if (user.bot) {
      return message.reply(`❌ You cannot transfer ${ferns}'s to bots!`);
    }

    if (!amount || amount <= 0) {
      return message.reply("❌ The transfer amount must be greater than 0.");
    }

    try {
      // ------------------------------------------------------
      // 🔄 1️⃣ MIGRATION — Convert old username_ID → ID-only
      // ------------------------------------------------------

      const senderOldKey = `${escapeUsername(sender.username)}_${sender.id}`;
      const userOldKey = `${escapeUsername(user.username)}_${user.id}`;

      const senderNewKey = `${sender.id}`;
      const userNewKey = `${user.id}`;

      const oldSenderObj = await db.wallet.get(senderOldKey);
      const oldUserObj = await db.wallet.get(userOldKey);

      if (oldSenderObj !== undefined) {
        await db.wallet.set(senderNewKey, oldSenderObj);
        await db.wallet.delete(senderOldKey);
      }

      if (oldUserObj !== undefined) {
        await db.wallet.set(userNewKey, oldUserObj);
        await db.wallet.delete(userOldKey);
      }

      // ------------------------------------------------------
      // 2️⃣ Load balances using NEW ID-only keys
      // ------------------------------------------------------

      const senderData = (await db.wallet.get(senderNewKey)) ?? { balance: 0 };
      const userData = (await db.wallet.get(userNewKey)) ?? { balance: 0 };

      const senderBalance = senderData.balance || 0;
      const userBalance = userData.balance || 0;

      if (senderBalance < amount) {
        return message.reply(
          `❌ You do not have enough points to transfer **${amount.toLocaleString()}${ferns}**.`
        );
      }

      // ------------------------------------------------------
      // 3️⃣ Apply transaction
      // ------------------------------------------------------

      await db.wallet.set(senderNewKey, { balance: senderBalance - amount });
      await db.wallet.set(userNewKey, { balance: userBalance + amount });

      await message.reply(
        `✅ **__Payment Successful!__**\n**${sender.username}** paid **${ferns}${amount.toLocaleString()}** to **${user.username}**.`
      );

      // ------------------------------------------------------
      // Logging
      // ------------------------------------------------------

      console.log(
        `[🌿] [PAY] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
        `${message.guild.name} ${message.guild.id} ${sender.username} paid ` +
        `${amount.toLocaleString()} Ferns to ${user.username}`
      );

    } catch (error) {
      console.error(error);
      return message.reply(
        "❌ An error occurred while processing the transaction. Please try again later."
      );
    }
  },
};
