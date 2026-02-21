// monthly.js (PREFIX COMMAND)
const { EmbedBuilder } = require("discord.js");
const db = require("../../../Handlers/database");

const monthlyCooldown = 30 * 24 * 60 * 60 * 1000; // 30 days
const rewardAmount = 3000;

module.exports = {
  name: "monthly",
  description: "Claim monthly Ferns",

  async execute(message, args, client) {

    if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    // const ferns = '<:Ferns:1473337406659891252>'; // For Testing Formatting.
    const ferns = "<:Ferns:1395219665638391818>";

    const { author, guild } = message;

    const username = author.username;
    const newKey = `${author.id}`;
    const space = "ㅤ";

    const top = `**🌿 __${username}'s Monthly!__ 🌿**`;
    const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const bottom = `🌿・Come back next month!`;

    // ------------------------------------------------------
    // 1️⃣ MIGRATION — username-based → ID-only keys
    // ------------------------------------------------------
    const safeUsername = author.username.replace(/\./g, "_");
    const oldKey = `${safeUsername}_${author.id}`;

    const oldWalletObj = await db.wallet.get(oldKey);
    const oldBankObj = await db.bank.get(oldKey);
    const oldLastClaimObj = await db.lastclaim.get(oldKey);

    if (oldWalletObj !== undefined) {
      await db.wallet.set(newKey, oldWalletObj);
      await db.wallet.delete(oldKey);
    }

    if (oldBankObj !== undefined) {
      await db.bank.set(newKey, oldBankObj);
      await db.bank.delete(oldKey);
    }

    if (oldLastClaimObj !== undefined) {
      await db.lastclaim.set(newKey, oldLastClaimObj);
      await db.lastclaim.delete(oldKey);
    }
    // ------------------------------------------------------

    const lastClaim = (await db.lastclaim.get(`${newKey}.monthly`)) || 0;
    const now = Date.now();

    if (now - lastClaim < monthlyCooldown) {
      const timeLeft = monthlyCooldown - (now - lastClaim);

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return message.reply(
        `⏳ You have already claimed your monthly reward!\n` +
        `Please wait **${days}d ${hours}h ${minutes}m** before claiming again.`
      );
    }

    // Balances
    let bank = (await db.bank.get(`${newKey}.bank`)) || 0;
    let balance = (await db.wallet.get(`${newKey}.balance`)) || 0;

    // Reward
    balance += rewardAmount;

    await db.wallet.set(`${newKey}.balance`, balance);
    await db.lastclaim.set(`${newKey}.monthly`, now);

    // Embed
    const embed = new EmbedBuilder()
      .setTitle(top)
      .setDescription(
        `You have claimed your monthly reward of **${ferns}・${rewardAmount.toLocaleString()}**!\n` +
        `${middle}\n` +
        `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
        `ㅤ ${ferns}・${balance.toLocaleString()}     ${ferns}・${bank.toLocaleString()}\n` +
        `${middle}`
      )
      .setFooter({ text: bottom })
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setColor(0x207e37);

    await message.reply({ embeds: [embed] });

    console.log(
      `[🌿] [MONTHLY] [${new Date().toLocaleDateString("en-GB")}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", {
        timeZone: "Pacific/Auckland",
      })}] ` +
      `${guild.name} ${guild.id} ${username} claimed ${rewardAmount} Ferns.`
    );
  },
};
