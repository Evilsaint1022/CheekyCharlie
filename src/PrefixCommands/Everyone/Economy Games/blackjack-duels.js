const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute

module.exports = {
  name: 'blackjack-duels',
  aliases: ['bjd', 'blackjackduel'],

  async execute(message, args) {
    // ❌ No DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const { guild, author, channel } = message;

    // 🧑 Opponent
    const opponent = message.mentions.users.first();
    if (!opponent) {
      return message.reply('❌ You must mention a user to challenge.');
    }

    // 💰 Bet
    const bet = parseInt(args[1]);
    if (isNaN(bet)) {
      return message.reply('❌ You must provide a valid bet amount.');
    }

    const ferns = '<:Ferns:1395219665638391818>';

    // ❌ Invalid opponent
    if (opponent.bot || opponent.id === author.id) {
      return message.reply('❌ You can’t challenge bots or yourself.');
    }

    // 🌐 GLOBAL COOLDOWN
    const GLOBAL_COOLDOWN_KEY = `${guild.id}.blackjack-duels`;
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      return message.reply(`⏳ The blackjack duel command is on cooldown. Please wait ${remaining} seconds.`);
    }

    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    // 💳 Balances
    const balanceKeyChallenger = `${author.id}.balance`;
    const balanceKeyOpponent = `${opponent.id}.balance`;

    let challengerBalance = parseInt(await db.wallet.get(balanceKeyChallenger) ?? 0);
    let opponentBalance = parseInt(await db.wallet.get(balanceKeyOpponent) ?? 0);

    if (bet <= 0) {
      return message.reply('❌ Bet amount must be greater than zero.');
    }

    if (challengerBalance < bet) {
      return message.reply(`❌ You don’t have enough balance to bet ${ferns}${bet}.`);
    }

    if (opponentBalance < bet) {
      return message.reply(`❌ ${opponent.username} doesn’t have enough balance to match this bet.`);
    }

    // 📨 Invite
    const inviteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const inviteMsg = await channel.send({
      content: `${opponent}, you’ve been challenged to a blackjack duel by ${author} for ${ferns}${bet.toLocaleString()}!`,
      components: [inviteRow]
    });

    const filter = i => i.user.id === opponent.id;
    const inviteCollector = inviteMsg.createMessageComponentCollector({ filter, time: 30000 });

    inviteCollector.on('collect', async (btn) => {
      if (btn.customId === 'decline') {
        await btn.update({ content: `${opponent.username} declined the blackjack challenge.`, components: [] });
        inviteCollector.stop();
        return;
      }

      if (btn.customId === 'accept') {
        await btn.update({ content: `✅ Challenge accepted! Starting blackjack...`, components: [] });
        inviteCollector.stop();

        // 🎴 Blackjack Logic
        const drawCard = () => Math.floor(Math.random() * 10) + 1;
        const calcTotal = cards => cards.reduce((a, b) => a + b, 0);

        let challengerCards = [drawCard(), drawCard()];
        let opponentCards = [drawCard(), drawCard()];
        let turn = author.id;

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
        );

        const makeEmbed = () => ({
          color: 0xFFFFFF,
          title: '**__♦️ Blackjack Duel ♦️__**',
          description: `${author.username} vs ${opponent.username}\n\nBet: ${ferns}${bet.toLocaleString()}`,
          fields: [
            { name: `${author.username}'s Cards`, value: challengerCards.join(', ') },
            { name: `${author.username}'s Total`, value: calcTotal(challengerCards).toString() },
            { name: `${opponent.username}'s Cards`, value: opponentCards.join(', ') },
            { name: `${opponent.username}'s Total`, value: calcTotal(opponentCards).toString() },
            { name: 'Turn', value: `<@${turn}>` }
          ]
        });

        const gameMsg = await channel.send({ embeds: [makeEmbed()], components: [buttons] });
        const collector = gameMsg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (btn) => {
          if (btn.user.id !== turn) {
            return btn.reply({ content: '❌ It’s not your turn!', ephemeral: true });
          }

          let currentCards = turn === author.id ? challengerCards : opponentCards;

          if (btn.customId === 'hit') currentCards.push(drawCard());
          if (btn.customId === 'stand') turn = turn === author.id ? opponent.id : author.id;

          const challengerTotal = calcTotal(challengerCards);
          const opponentTotal = calcTotal(opponentCards);

          let winner = null;
          if (challengerTotal > 21) winner = opponent;
          if (opponentTotal > 21) winner = author;

          if (winner) {
            if (winner.id === author.id) {
              challengerBalance += bet * 2;
              opponentBalance -= bet;
            } else {
              challengerBalance -= bet;
              opponentBalance += bet * 2;
            }

            await db.wallet.set(balanceKeyChallenger, challengerBalance);
            await db.wallet.set(balanceKeyOpponent, opponentBalance);

            return btn.update({
              embeds: [{
                color: 0x00FF00,
                title: '**__♠️ Blackjack Results ♠️__**',
                description: `${winner.username} wins ${ferns}${bet.toLocaleString()}!`,
                fields: [
                  { name: `${author.username}'s Balance`, value: `${ferns}${challengerBalance}` },
                  { name: `${opponent.username}'s Balance`, value: `${ferns}${opponentBalance}` }
                ]
              }],
              components: []
            });
          }

          if (btn.customId === 'hit') {
            turn = turn === author.id ? opponent.id : author.id;
          }

          await btn.update({ embeds: [makeEmbed()], components: [buttons] });
        });
      }
    });

    inviteCollector.on('end', async (collected) => {
      if (!inviteMsg.editable) return;
      if (collected.size === 0) {
        inviteMsg.edit({ content: `⌛ ${opponent.username} did not respond in time.`, components: [] });
      }
    });
  }
};
