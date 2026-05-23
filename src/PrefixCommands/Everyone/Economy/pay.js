const { EmbedBuilder } = require("discord.js");
const db = require("../../../Handlers/database");

// Replace /\./g with _ when saving (legacy)
function escapeUsername(username) {
  return username.replace(/\./g, '_');
}

module.exports = {
  name: "pay",
  aliases: [],
  description: "Transfer currency to another member.",

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

    const custom = await db.settings.get(`${message.guild.id}.currencyicon`)
    const ferns = await db.default.get("Default.ferns");

    const customname = await db.settings.get(`${message.guild.id}.currencyname`)
    const fernsname = await db.default.get("Default.name");

    const sender = message.author;
    const bar = `**─────────────────────────────────**`;

    // --------------------
    // Argument parsing
    // --------------------
    const isTaxPay = args.includes("tax");
    const filteredArgs = args.filter(a => a !== "tax");

    // IMPORTANT: use filteredArgs from here onward
    const user =
      message.mentions.users.first() ||
      message.guild.members.cache.get(filteredArgs[0])?.user;

    const amount = parseInt(filteredArgs[1], 10);

    // ------------------------------------------------------
    // 🧾 TAX MODE HANDLER
    // ------------------------------------------------------

    if (isTaxPay) {

      const senderNewKey = `${sender.id}.balance`;
      const senderBalance = (await db.wallet.get(senderNewKey)) || 0;

      const taxDebt = Number(await db.tax.get(`${sender.id}.tax`) || 0);
      const amount = Number(args[1]);

      if (!amount || isNaN(amount)) {
        return message.reply("❌ Please provide a valid amount.\nExample: `?pay tax 100`");
      }

      if (taxDebt <= 0) {
        return message.reply("✅ You do not have any tax to pay.");
      }

      if (senderBalance < amount) {
        return message.reply(
          `❌ You don't have enough funds.\n🧾 Tax Due: ${custom || ferns} ${taxDebt.toLocaleString()}`
        );
      }

      const payAmount = Math.min(amount, taxDebt);

      const newBalance = senderBalance - payAmount;
      const newTax = taxDebt - payAmount;

      await db.wallet.set(senderNewKey, { balance: newBalance });
      await db.tax.set(`${sender.id}.tax`, newTax);
      await db.tax.set(`${sender.id}.lastpayed`, Date.now());

      // Console Logs
      console.log(`[🌿] [TAX] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} ${message.guild.id} ${sender.username} paid ${payAmount.toLocaleString()} ${customname || fernsname} towards their tax's`);

      return message.reply(
        `🧾 **__Tax Payment Successful!__**\n` +
        `${bar}\n` +
        `💰 Paid Amount: **${custom || ferns} ${payAmount.toLocaleString()}**\n` +
        `⚠️ Remaining Tax: **${custom || ferns} ${newTax.toLocaleString()}**\n` +
        `${bar}\n`
      );
    }

    if (!user) {
      return message.reply("❌ Please mention a valid user.\nUsage: `?pay @user <amount>`");
    }

    if (sender.id === user.id) {
      return message.reply("❌ You cannot pay yourself!");
    }

    if (user.bot) {
      return message.reply(`❌ You cannot transfer ${customname || fernsname}'s to bots!`);
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
          `❌ You do not have enough ${customname || fernsname} to transfer ${custom || ferns} **${amount.toLocaleString()}**.`
        );
      }

      // ------------------------------------------------------
      // 3️⃣ Apply transaction
      // ------------------------------------------------------

      await db.wallet.set(senderNewKey, { balance: senderBalance - amount });
      await db.wallet.set(userNewKey, { balance: userBalance + amount });

      await message.reply(
        `✅ **__Payment Successful!__**\n**${sender.username}** paid **${custom || ferns} ${amount.toLocaleString()}** to **${user.username}**.`
      );

      // Console Logs
      console.log(
        `[🌿] [PAY] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
        `${message.guild.name} ${message.guild.id} ${sender.username} paid ` +
        `${amount.toLocaleString()} ${customname || fernsname} to ${user.username}`
      );

    } catch (error) {
      console.error(error);
      return message.reply(
        "❌ An error occurred while processing the transaction. Please try again later."
      );
    }
  },
};
