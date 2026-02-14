const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path if needed

module.exports = {
  name: 'heist',
  description: 'Heist another user\'s Bank',

  async execute(message, args) {

    const robber = message.author;
    const target =
            message.mentions.users.first() ||
            (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    if (!target) return message.reply('You must mention someone to heist!');

    if (target.id === robber.id) return message.reply('You cannot heist yourself!');

    // Get wallets
    const robberData = await db.bank.get(robber.id) ?? { balance: 0 };
    const targetData = await db.bank.get(target.id) ?? { balance: 0 };

    const robberBalance = robberData.balance ?? 0;
    const targetBalance = targetData.balance ?? 0;

    if (targetBalance <= 0) {
      return message.reply(`${target.username} has no money to steal in the bank!`);
    }

    const randomAmount = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
    const stealAmount = Math.min(randomAmount, targetBalance); // don't steal more than they have

    // Update balances
    targetData.balance -= stealAmount;
    robberData.balance += stealAmount;

    // Save back to db
    await db.bank.set(target.id, targetData);
    await db.bank.set(robber.id, robberData);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🦹 Heist Successful!')
      .setDescription(`You stole **$${stealAmount}** from ${target.username}!`);

    return message.reply({ embeds: [embed] });
  }
};
