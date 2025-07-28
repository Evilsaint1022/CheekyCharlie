const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute
const GLOBAL_COOLDOWN_KEY = 'slots_global';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spin the slot machine and bet your balance!')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('The amount to bet')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { guild, user } = interaction;
    const bet = interaction.options.getInteger('bet');
    const balanceKey = `${user.username}_${user.id}.balance`;
    const ferns = '<:Ferns:1395219665638391818>';

    // 🌐 Global cooldown check
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      return interaction.reply({ content: `⏳ The /slots command is on global cooldown. Please wait ${remaining} more seconds.`, flags: 64 });
    }

    // Set the cooldown
    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    console.log(`[🎰] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${user.username} used the Slots command.`);
    console.log(`[🎰] [${new Date().toLocaleTimeString()}] ${user.username} placed a bet of ${bet.toLocaleString()} Ferns.`);

    let balance = await db.balance.get(balanceKey);

    if (balance === undefined || isNaN(parseInt(balance))) {
      return interaction.reply({ content: `You don't have a valid balance record. Please contact an admin.`, flags: 64 });
    }

    balance = parseInt(balance);

    if (bet > balance) {
      return interaction.reply({ content: `You don't have enough balance to place this bet.`, flags: 64 });
    } else if (bet <= 0) {
      return interaction.reply({ content: `Bet amount must be greater than zero.`, flags: 64 });
    }

    // Deduct bet upfront
    balance -= bet;
    await db.balance.set(balanceKey, balance);

    const symbols = ['🍒', '🍋', '🍉', '💎', '7️⃣'];
    const spin = () => [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    await interaction.deferReply();
    let spins = 0;
    const maxSpins = 5;

    const embed = new EmbedBuilder()
      .setTitle(`🎰 **__Spinning the Slots__**`)
      .setColor(0xFFFFFF)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(`Placed Bet: ${ferns}${bet.toLocaleString()}\n\n\`Spinning...\``)
      .addFields({ name: 'Slots', value: `⬛ | ⬛ | ⬛`, inline: false });

    const message = await interaction.editReply({ embeds: [embed] });

    const interval = setInterval(async () => {
      const current = spin();
      embed.spliceFields(0, 1, {
        name: 'Slots',
        value: `${current.join(' | ')}`,
        inline: false
      });
      await message.edit({ embeds: [embed] });

      spins++;

      if (spins >= maxSpins) {
        clearInterval(interval);

        const final = spin();
        const finalResult = final.join(' | ');
        const win = final.every((val) => val === final[0]);

        let resultText;
        let resultColor;

        if (win) {
          const winnings = bet * 2;
          balance += winnings;
          await db.balance.set(balanceKey, balance);
          resultText = `🎉 You **won** ${ferns}${winnings.toLocaleString()}!`;
          resultColor = 0x00FF00;
          console.log(`[🎰] [${new Date().toLocaleTimeString()}] ${user.username} WON a bet of ${bet.toLocaleString()} Ferns.`);
        } else {
          resultText = `😢 You lost your bet of ${ferns}${bet.toLocaleString()}.`;
          resultColor = 0xFF0000;
          console.log(`[🎰] [${new Date().toLocaleTimeString()}] ${user.username} LOST a bet of ${bet.toLocaleString()} Ferns.`);
        }

        const resultEmbed = new EmbedBuilder()
          .setTitle(`🎰 **__Slots Result__**`)
          .setColor(resultColor)
          .setThumbnail(user.displayAvatarURL())
          .setDescription(resultText)
          .addFields(
            { name: 'Final Slots', value: finalResult, inline: false },
            { name: 'New Balance', value: `${ferns}${balance.toLocaleString()}`, inline: false }
          );

        await message.edit({ embeds: [resultEmbed] });
      }
    }, 700);
  }
};
