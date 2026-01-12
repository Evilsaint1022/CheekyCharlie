const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute

module.exports = {
  name: 'blackjack-singleplayer',
  aliases: ['bj', 'blackjack'],

  async execute(message, args) {
    // ❌ No DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const { guild, author, channel } = message;
    const bet = parseInt(args[0]);

    if (isNaN(bet)) {
      return message.reply('❌ You must provide a valid bet amount.');
    }

    const GLOBAL_COOLDOWN_KEY = `${guild.id}.blackjack-singleplayer`;
    const ferns = '<:Ferns:1395219665638391818>';

    // 🌐 GLOBAL COOLDOWN
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      return message.reply(`⏳ The blackjack command is on cooldown. Please wait ${remaining} seconds.`);
    }

    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    // ------------------------------------------------------
    // 🔄 MIGRATION — username_userid → userid
    // ------------------------------------------------------
    const safeUsername = author.username.replace(/\./g, '_');
    const oldKey = `${safeUsername}_${author.id}`;
    const newKey = `${author.id}`;

    let walletObj = await db.wallet.get(newKey);

    if (walletObj === undefined) {
      const oldWalletObj = await db.wallet.get(oldKey);

      if (oldWalletObj !== undefined) {
        await db.wallet.set(newKey, oldWalletObj);
        await db.wallet.delete(oldKey);
        walletObj = oldWalletObj;
      }
    }

    if (!walletObj || typeof walletObj !== 'object') {
      return message.reply(`❌ You don't have a wallet record yet.`);
    }

    let balance = parseInt(walletObj.balance);
    if (isNaN(balance)) {
      return message.reply(`❌ Your wallet balance is invalid. Please contact an admin.`);
    }

    // ------------------------------------------------------

    if (bet <= 0) {
      return message.reply('❌ Bet amount must be greater than zero.');
    }

    if (bet > balance) {
      return message.reply('❌ You don’t have enough balance to place this bet.');
    }

    // 🎴 Blackjack Logic
    const drawCard = () => Math.floor(Math.random() * 10) + 1;

    let playerCards = [drawCard(), drawCard()];
    let dealerCards = [drawCard(), drawCard()];

    let playerTotal = playerCards.reduce((a, b) => a + b, 0);
    let dealerTotal = dealerCards.reduce((a, b) => a + b, 0);

    const checkGameResult = () => {
      if (playerTotal > 21) return 'lose';
      if (dealerTotal > 21) return 'win';
      if (dealerTotal >= 17 && playerTotal > dealerTotal) return 'win';
      if (dealerTotal >= 17 && playerTotal < dealerTotal) return 'lose';
      if (dealerTotal >= 17 && playerTotal === dealerTotal) return 'tie';
      return null;
    };

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
    );

    const embed = {
      color: 0xFFFFFF,
      title: '**__♦️ Blackjack ♦️__**',
      description: `Placed Bet: ${ferns}${bet.toLocaleString()}\n\n\`Your move: Hit or Stand?\``,
      thumbnail: { url: author.displayAvatarURL() },
      fields: [
        { name: 'Your Cards', value: playerCards.join(', '), inline: true },
        { name: 'Your Total', value: playerTotal.toString(), inline: true },
        { name: `Dealer's Cards`, value: dealerCards[0] + ', ?', inline: false }
      ]
    };

    const gameMsg = await channel.send({ embeds: [embed], components: [buttons] });

    const filter = i => i.user.id === author.id;
    const collector = gameMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (btn) => {
      if (btn.customId === 'hit') {
        playerCards.push(drawCard());
        playerTotal = playerCards.reduce((a, b) => a + b, 0);
      }

      if (btn.customId === 'stand') {
        while (dealerTotal < 17) {
          dealerCards.push(drawCard());
          dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
        }
        collector.stop('stood');
      }

      const result = checkGameResult();

      if (result || btn.customId === 'stand') {
        const finalResult = result || checkGameResult();

        if (finalResult === 'win') balance += bet * 2;
        if (finalResult === 'lose') balance -= bet;

        walletObj.balance = balance;
        await db.wallet.set(newKey, walletObj);

        const resultEmbed = {
          color: finalResult === 'win' ? 0x00FF00 : finalResult === 'lose' ? 0xFF0000 : 0xFFFF00,
          title: '**__♠️ Blackjack Results ♠️__**',
          description: `You ${finalResult} your bet of ${ferns}${bet.toLocaleString()}`,
          thumbnail: { url: author.displayAvatarURL() },
          fields: [
            { name: 'Your Cards', value: playerCards.join(', '), inline: true },
            { name: 'Your Total', value: playerTotal.toString(), inline: true },
            { name: `Dealer's Cards`, value: dealerCards.join(', '), inline: false },
            { name: `Dealer's Total`, value: dealerTotal.toString(), inline: true },
            { name: '**__New Balance__**', value: `${ferns}${balance.toLocaleString()}`, inline: false }
          ]
        };

        return btn.update({ embeds: [resultEmbed], components: [] });
      }

      const updatedEmbed = {
        color: 0xFFFFFF,
        title: '**__♣️ Blackjack ♣️__**',
        description: `Placed Bet: ${ferns}${bet.toLocaleString()}\n\n\`Your move: Hit or Stand?\``,
        thumbnail: { url: author.displayAvatarURL() },
        fields: [
          { name: 'Your Cards', value: playerCards.join(', '), inline: true },
          { name: 'Your Total', value: playerTotal.toString(), inline: true },
          { name: `Dealer's Cards`, value: dealerCards[0] + ', ?', inline: false }
        ]
      };

      await btn.update({ embeds: [updatedEmbed], components: [buttons] });
    });

    collector.on('end', () => {
      if (gameMsg.editable) gameMsg.edit({ components: [] });
    });
  }
};
