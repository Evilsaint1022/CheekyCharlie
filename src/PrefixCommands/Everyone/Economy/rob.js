const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path if needed

function formatAmount(amount) {
  if (amount >= 1_000_000_000) {
    return (Math.floor(amount / 100_000_000) / 10)
      .toString().replace(/\.0$/, '') + 'b';
  }

  if (amount >= 1_000_000) {
    return (Math.floor(amount / 100_000) / 10)
      .toString().replace(/\.0$/, '') + 'm';
  }

  if (amount >= 1_000) {
    return (Math.floor(amount / 100) / 10)
      .toString().replace(/\.0$/, '') + 'k';
  }

  return amount.toString();
}

module.exports = {
  name: 'rob',
  description: 'Rob another user\'s Wallet',

  async execute(message, args) {

    if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const robber = message.author;
    const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    if (!args[0] || !target) {
      return message.reply(`You must use \`@username\` or \`userid\``)
    };

    // Target Passive Mode Check
    let targetPassive = await db.passive.get(target.id);

    // If no data exists, set default to true
    if (targetPassive === undefined || targetPassive === null) {
      targetPassive = { passive: true };
      await db.passive.set(target.id, targetPassive);
    }

    // If passive is enabled
    if (targetPassive.passive === true) {
      return message.reply(`🛡️ ${target.username} is in passive mode!`);
    }

    // Command Cooldown check
    const commandcooldown = 4 * 60 * 60 * 1000; // 4 hours
    const now = Date.now();
    const lastUsed = await db.cooldowns.get(`${robber.id}.lastrob`) || 0;

    if (now - lastUsed < commandcooldown) {
      const timeLeft = commandcooldown - (now - lastUsed);

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      return message.reply(
        `⏳ Hold up! You can rob again in **${hours}h ${minutes}m ${seconds}s**.`
      );
    }

    // User Cooldown check
    const UserCooldown = 12 * 60 * 60 * 1000; // 12 hours
    const lastrob = await db.stolen.get(`${target.id}.timestamp`) || 0;

    if (now - lastrob < UserCooldown) {
      const timeLeft = UserCooldown - (now - lastrob);

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      return message.reply(
        `⏳ Hold up! ${target.username} cant be stolen from again for **${hours}h ${minutes}m ${seconds}s**.`
      );
    }

    if (!target) return message.reply('You must mention someone to rob!');

    if (target.bot) return message.reply('You cannot rob a bot!');

    if (target.id === robber.id) return message.reply('You cannot rob yourself!');

    const top = `***🌿 \`Robbery Successful\` 🌿***`;
    const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const bottom = `🌿・You better hope no one robs you!`;

    const space = 'ㅤ';

    const custom = await db.settings.get(`${message.guild.id}.currencyicon`)
    const ferns = await db.default.get("Default.ferns");

    const customname = await db.settings.get(`${message.guild.id}.currencyname`)
    const fernsname = await db.default.get("Default.name");

    // Get wallets
    const robberData = await db.wallet.get(robber.id) ?? { balance: 0 };
    const targetData = await db.wallet.get(target.id) ?? { balance: 0 };

    const robberBalance = robberData.balance ?? 0;
    const targetBalance = targetData.balance ?? 0;

    if (targetBalance <= 0) {
      return message.reply(`${target.username} has no ${customname || ferns} to steal!`);
    }

    // Generate a random percentage between 5% and 25%.
    const randomPercentage = Math.random() * (0.25 - 0.05) + 0.05;

    // Calculate the random amount based on their balance.
    const randomAmount = Math.floor(targetBalance * randomPercentage);

    // Never steal more than the target has, with a minimum of 1.
    const stealAmount = Math.min(Math.max(1, randomAmount), targetBalance);

    // Update cooldown
    await db.stolen.set(`${target.id}.timestamp`, now);
    await db.cooldowns.set(`${robber.id}.lastrob`, now);

    // Update balances
    targetData.balance -= stealAmount;
    robberData.balance += stealAmount;

    // Save back to db
    await db.wallet.set(target.id, targetData);
    await db.wallet.set(robber.id, robberData);

      // DB lookup AFTER migration
      const balance = await db.wallet.get(`${robber.id}.balance`) || 0;
      const bank = await db.bank.get(`${robber.id}.bank`) || 0;

    console.log(
            `[🌿] [ROB] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${message.guild.name} ${message.guild.id} ${robber.username} used the rob command to rob ${target.username} for ${stealAmount.toLocaleString()} ${customname || fernsname}.`
    );

    // Format amounts 
    const formattedBalance = formatAmount(balance); 
    const formattedBank = formatAmount(bank);

        // Spacing Formatting for the embed message! -------------
        let spacing = ``;

        // Debug Console Log
        // console.log(formattedBalance.length);

        if (formattedBalance.length === 6) {
            spacing = "  "
        } else if (formattedBalance.length === 5) {
            spacing = "   "
        } else if (formattedBalance.length === 4) {
            spacing = "    "
        } else if (formattedBalance.length === 3) {
            spacing = "    " 
        } else if (formattedBalance.length === 2) {
            spacing = "     "
        } else if (formattedBalance.length === 1) {
            spacing = "     "
        } else if (formattedBalance.length === 0) {
            spacing = "      "
        };
        // --------------------------------------------------------

    const embed = new EmbedBuilder()
      .setColor(0x207e37)
      .setTitle(top)
      .setDescription(
        `_You Robbed **${target.username}** for ${custom || fernsname}**\`${stealAmount.toLocaleString()}\`** ${customname || fernsname}!_\n` +
        `${middle}\n` +
        `ㅤ **💰__Wallet__**    **🏦__Bank__**\n` +
        `ㅤ ***${custom || ferns}・\`${formattedBalance}\`${spacing}${custom || ferns}・\`${formattedBank}\`***\n` +
        `${middle}`
      )
      .setFooter({ text: bottom })
      .setThumbnail(robber.displayAvatarURL({ dynamic: true }));

    return message.reply({ embeds: [embed] });
  }
};
