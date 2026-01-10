const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute

module.exports = {
  name: 'slots',
  description: 'Spin the slot machine and bet your balance!',
  usage: '!slots <bet>',

  async execute(message, args) {

    if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const { guild, author } = message;
    const ferns = '<:Ferns:1395219665638391818>';
    const balanceKey = `${author.id}.balance`;
    const GLOBAL_COOLDOWN_KEY = `${guild.id}.slots`;

    // 🎯 Get bet amount
    const bet = parseInt(args[0]);
    if (!bet || isNaN(bet)) {
      return message.reply("Please provide a valid bet amount.");
    }

    // ⏳ Global cooldown
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      return message.reply(
        `⏳ The slots command is on global cooldown. Please wait ${remaining} more seconds.`
      );
    }

    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    console.log(
      `[🌿] [SLOTS] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${guild.name} ${guild.id} ${author.username} placed a bet of ${bet.toLocaleString()} Ferns.`
    );

    // 💰 Balance checks
    let balance = await db.wallet.get(balanceKey);
    if (balance === undefined || isNaN(parseInt(balance))) {
      return message.reply("You don't have a valid balance record. Please contact an admin.");
    }

    balance = parseInt(balance);

    if (bet > balance) {
      return message.reply("You don't have enough balance to place this bet.");
    }

    if (bet <= 0) {
      return message.reply("Bet amount must be greater than zero.");
    }

    // 💸 Deduct bet upfront
    balance -= bet;
    await db.wallet.set(balanceKey, balance);

    // 🎰 Slot logic
    const symbols = ['🍒', '🍋', '🍉', '💎', '7️⃣'];
    const spin = () => [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    let spins = 0;
    const maxSpins = 5;
    let finished = false;

    const embed = new EmbedBuilder()
      .setTitle('🎰 **__Spinning the Slots__**')
      .setColor(0xFFFFFF)
      .setThumbnail(author.displayAvatarURL())
      .setDescription(`Placed Bet: ${ferns}${bet.toLocaleString()}\n\n\`Spinning...\``)
      .addFields({ name: 'Slots', value: '⬛ | ⬛ | ⬛' });

    const slotMessage = await message.reply({ embeds: [embed] });

    const interval = setInterval(async () => {
      if (finished) return;

      const current = spin();
      embed.spliceFields(0, 1, {
        name: 'Slots',
        value: current.join(' | ')
      });

      await slotMessage.edit({ embeds: [embed] });
      spins++;

      if (spins >= maxSpins && !finished) {
        finished = true;
        clearInterval(interval);

        // 🎲 50/50 win chance
        const win = Math.random() < 0.5;
        let final;

        if (win) {
          const symbol = symbols[Math.floor(Math.random() * symbols.length)];
          final = [symbol, symbol, symbol];
        } else {
          do {
            final = spin();
          } while (final[0] === final[1] && final[1] === final[2]);
        }

        const finalResult = final.join(' | ');
        let resultText;
        let resultColor;

        if (win) {
          const winnings = bet * 2;
          balance += winnings;
          await db.wallet.set(balanceKey, balance);

          resultText = `🎉 You **won** ${ferns}${winnings.toLocaleString()}!`;
          resultColor = 0x00FF00;

          console.log(
        `[🌿] [SLOTS] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
        `${guild.name} ${guild.id} ${author.username} WON ${bet.toLocaleString()} Ferns`
          );
        } else {
          await db.wallet.set(balanceKey, balance);

          resultText = `😢 You lost your bet of ${ferns}${bet.toLocaleString()}.`;
          resultColor = 0xFF0000;

          console.log(
        `[🌿] [SLOTS] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
        `$${guild.name} ${guild.id} ${author.username} LOST ${bet.toLocaleString()} Ferns`
          );
        }

        const resultEmbed = new EmbedBuilder()
          .setTitle('🎰 **__Slots Result__**')
          .setColor(resultColor)
          .setThumbnail(author.displayAvatarURL())
          .setDescription(resultText)
          .addFields(
            { name: 'Final Slots', value: finalResult },
            { name: 'New Balance', value: `${ferns}${balance.toLocaleString()}` }
          );

        await slotMessage.edit({ embeds: [resultEmbed] });
      }
    }, 700);
  }
};
