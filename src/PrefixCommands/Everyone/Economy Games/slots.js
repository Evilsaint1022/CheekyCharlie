const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute

// simple async sleep helper
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

module.exports = {
  name: 'slots',
  description: 'Spin the slot machine and bet your balance!',
  usage: '!slots <bet>',

  async execute(message, args) {

    // ❌ No DMs
    if (message.channel.isDMBased()) {
      return message.reply("This command cannot be used in DMs.");
    }

    const { guild, author } = message;
    const ferns = '<:Ferns:1395219665638391818>';
    const balanceKey = `${author.id}.balance`;
    const GLOBAL_COOLDOWN_KEY = `${guild.id}.slots`;

    // 🎯 Bet parsing
    const bet = parseInt(args[0], 10);
    if (!bet || isNaN(bet)) {
      return message.reply("Please provide a valid bet amount.");
    }

    if (bet <= 0) {
      return message.reply("Bet amount must be greater than zero.");
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

    // 💰 Balance
    let balance = parseInt(await db.wallet.get(balanceKey), 10);

    if (isNaN(balance)) {
      return message.reply("You don't have a valid balance record.");
    }

    if (bet > balance) {
      return message.reply("You don't have enough balance to place this bet.");
    }

    // 💸 Deduct bet upfront
    balance -= bet;
    await db.wallet.set(balanceKey, balance);

    console.log(
      `[🌿] [SLOTS] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${guild.name} ${guild.id} ${author.username} bet ${bet.toLocaleString()}`
    );

    // 🎰 Slot setup
    const symbols = ['🍒', '🍋', '🍉', '💎', '7️⃣'];

    const spin = () => ([
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ]);

    // 🖼 Initial embed
    const baseEmbed = new EmbedBuilder()
      .setTitle('🎰 **__Spinning the Slots__**')
      .setColor(0x207e37)
      .setThumbnail(author.displayAvatarURL())
      .setDescription(`Placed Bet: ${ferns}${bet.toLocaleString()}\n\n\`Spinning...\``)
      .addFields({ name: 'Slots', value: '⬛ | ⬛ | ⬛' });

    const slotMessage = await message.reply({ embeds: [baseEmbed] });

    // 🔄 Spin animation (SAFE)
    const maxSpins = 3;

    for (let i = 0; i < maxSpins; i++) {
      const current = spin();

      const spinningEmbed = EmbedBuilder.from(baseEmbed)
        .spliceFields(0, 1, {
          name: 'Slots',
          value: current.join(' | ')
        });

      await slotMessage.edit({ embeds: [spinningEmbed] });
      await sleep(700);
    }

    // 🎲 Win logic (50/50)
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

    let resultText;
    let resultColor;

    if (win) {
      const winnings = bet * 2;
      balance += winnings;
      await db.wallet.set(balanceKey, balance);

      resultText = `🎉 You **won** ${ferns}${winnings.toLocaleString()}!`;
      resultColor = 0x00FF00;

      console.log(`[🌿] [SLOTS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${author.username} WON ${winnings}`);
    } else {
      resultText = `😢 You lost your bet of ${ferns}${bet.toLocaleString()}.`;
      resultColor = 0xFF0000;

      console.log(`[🌿] [SLOTS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${author.username} LOST ${bet}`);
    }

    // 🏁 Final result embed
    const resultEmbed = new EmbedBuilder()
      .setTitle('🎰 **__Slots Result__**')
      .setColor(resultColor)
      .setThumbnail(author.displayAvatarURL())
      .setDescription(resultText)
      .addFields(
        { name: 'Final Slots', value: final.join(' | ') },
        { name: 'New Balance', value: `${ferns}${balance.toLocaleString()}` }
      );

    await slotMessage.edit({ embeds: [resultEmbed] });
  }
};
