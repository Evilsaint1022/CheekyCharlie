const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path if needed

module.exports = {
  name: 'rob',
  description: 'Rob another user\'s Wallet',

  async execute(message, args) {

    const robber = message.author;
    const target =
            message.mentions.users.first() ||
            (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    // Passive Mode Check
    const targetPassive = await db.passive.get(target.id);

    if (targetPassive?.passive) {
      return message.reply(`🛡️ ${target.username} is in passive mode!`);
    }

    // Robber Passive Mode Check
    const robberPassive = await db.passive.get(robber.id);

    if (robberPassive?.passive) {
      return message.reply(`🛡️ You Cant Rob In Passive Mode!`);
    }

    // Command Cooldown check
    const commandcooldown = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const lastUsed = await db.cooldowns.get(`${robber.id}.lastrob`);

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
    const UserCooldown = 24 * 60 * 60 * 1000; // 24 hours
    const lastrob = await db.stolen.get(`${target.id}.timestamp`);

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

    const top = `**──── 🌿 Robbery Successful 🌿 ────**`;
    const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
    const bottom = `**──────── Use Your Ferns Wisely! ────────**`;
    const ferns = '<:Ferns:1395219665638391818>';

    // Get wallets
    const robberData = await db.wallet.get(robber.id) ?? { balance: 0 };
    const targetData = await db.wallet.get(target.id) ?? { balance: 0 };

    const robberBalance = robberData.balance ?? 0;
    const targetBalance = targetData.balance ?? 0;

    if (targetBalance <= 0) {
      return message.reply(`${target.username} has no money to steal!`);
    }

    const randomAmount = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
    const stealAmount = Math.min(randomAmount, targetBalance); // don't steal more than they have

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
            `[🌿] [ROB] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${message.guild.name} ${message.guild.id} ${robber.username} used the rob command to rob ${target.username} for ${stealAmount} ferns.`
        );

    const embed = new EmbedBuilder()
      .setColor(0x207e37)
      .setTitle(top)
      .setDescription(
          `You Robbed **${target.username}** for **${stealAmount}** Ferns!\n` +
          `ㅤㅤㅤ${middle}\n` +
          `ㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\n` +
          `ㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤ  ${ferns}・${bank.toLocaleString()}\n` +
          `ㅤㅤㅤ${middle}`
        )
      .setFooter({ text: '🌿 You better hope no one robs you!' })
      .setTimestamp()
      .setThumbnail(robber.displayAvatarURL({ dynamic: true }));

    return message.reply({ embeds: [embed] });
  }
};
