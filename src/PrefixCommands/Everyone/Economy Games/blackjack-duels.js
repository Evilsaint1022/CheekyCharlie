const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute

module.exports = {
  name: 'blackjack-duels',
  aliases: ['bjd', 'blackjackduel'],

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const { guild, author, channel } = message;
    const opponent = message.mentions.users.first();
    const bet = parseInt(args[1]);
    const ferns = '<:Ferns:1395219665638391818>';

    if (!opponent) return message.reply('❌ You must mention a user to challenge.');
    if (opponent.bot || opponent.id === author.id)
      return message.reply('❌ You can’t challenge bots or yourself.');
    if (isNaN(bet) || bet <= 0)
      return message.reply('❌ You must provide a valid bet amount.');

    const GLOBAL_COOLDOWN_KEY = `${guild.id}.blackjack-duels`;
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      return message.reply(`⏳ Blackjack duels is on cooldown for ${remaining}s.`);
    }

    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    const balanceKeyChallenger = `${author.id}.balance`;
    const balanceKeyOpponent = `${opponent.id}.balance`;

    let challengerBalance = parseInt(await db.wallet.get(balanceKeyChallenger) ?? 0);
    let opponentBalance = parseInt(await db.wallet.get(balanceKeyOpponent) ?? 0);

    if (challengerBalance < bet)
      return message.reply(`❌ You don’t have enough balance to bet ${ferns}${bet}.`);
    if (opponentBalance < bet)
      return message.reply(`❌ ${opponent.username} doesn’t have enough balance.`);

    console.log(`[🌿] [BLACKJACK-DUELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${author.username} challenged ${opponent.username} for ${bet} ferns`);

    const inviteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
    );

    const inviteMsg = await channel.send({
      content: `${opponent}, you’ve been challenged by ${author} for ${ferns}${bet}!`,
      components: [inviteRow]
    });

    const inviteCollector = inviteMsg.createMessageComponentCollector({
      filter: i => i.user.id === opponent.id,
      time: 30000
    });

    inviteCollector.on('collect', async btn => {
      if (btn.customId === 'decline') {
        console.log(`[🌿] [BLACKJACK-DUELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${opponent.username} declined the duel`);
        return btn.update({ content: '❌ Challenge declined.', components: [] });
      }

      await btn.update({ content: '✅ Challenge accepted! Starting blackjack...', components: [] });
      inviteCollector.stop();

      console.log(`[🌿] [BLACKJACK-DUELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Duel started between ${author.username} and ${opponent.username}`);

      const drawCard = () => Math.floor(Math.random() * 10) + 1;
      const calcTotal = cards => cards.reduce((a, b) => a + b, 0);

      let challengerCards = [drawCard(), drawCard()];
      let opponentCards = [drawCard(), drawCard()];

      let turn = author.id;
      let stands = { [author.id]: false, [opponent.id]: false };

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
      );

      const makeEmbed = () => ({
        color: 0xffffff,
        title: '**__♦️ Blackjack Duel ♦️__**',
        description: `${author.username} vs ${opponent.username}\n\nBet: ${ferns}${bet}`,
        fields: [
          {
            name: `${author.username}'s Cards`,
            value: challengerCards.join(', ')
          },
          {
            name: `${opponent.username}'s Cards`,
            value: turn === author.id ? 'Hidden' : opponentCards.join(', ')
          },
          {
            name: 'Turn',
            value: `<@${turn}>`
          }
        ]
      });

      const gameMsg = await channel.send({ embeds: [makeEmbed()], components: [buttons] });
      const collector = gameMsg.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async btn => {
        if (btn.user.id !== turn)
          return btn.reply({ content: '❌ It’s not your turn!', ephemeral: true });

        let cards = turn === author.id ? challengerCards : opponentCards;

        if (btn.customId === 'hit') {
          cards.push(drawCard());
          stands[turn] = false;
        }

        if (btn.customId === 'stand') {
          stands[turn] = true;
        }

        const challengerTotal = calcTotal(challengerCards);
        const opponentTotal = calcTotal(opponentCards);

        console.log(`[🌿] [BLACKJACK-DUELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${btn.user.username} -> ${btn.customId}`);

        if (challengerTotal > 21 || opponentTotal > 21) {
          collector.stop();
          const winner = challengerTotal > 21 ? opponent : author;

          if (winner.id === author.id) {
            challengerBalance += bet;
            opponentBalance -= bet;
          } else {
            challengerBalance -= bet;
            opponentBalance += bet;
          }

          await db.wallet.set(balanceKeyChallenger, challengerBalance);
          await db.wallet.set(balanceKeyOpponent, opponentBalance);

          console.log(`[🌿] [BLACKJACK-DUELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${winner.username} wins by bust`);

          return btn.update({
            embeds: [{
              color: 0x00ff00,
              title: '**__♠️ Blackjack Results ♠️__**',
              description: `${winner.username} wins ${ferns}${bet}!`
            }],
            components: []
          });
        }

        if (stands[author.id] && stands[opponent.id]) {
          collector.stop();

          let winner = null;
          if (challengerTotal > opponentTotal) winner = author;
          else if (opponentTotal > challengerTotal) winner = opponent;

          if (winner) {
            if (winner.id === author.id) {
              challengerBalance += bet;
              opponentBalance -= bet;
            } else {
              challengerBalance -= bet;
              opponentBalance += bet;
            }

            await db.wallet.set(balanceKeyChallenger, challengerBalance);
            await db.wallet.set(balanceKeyOpponent, opponentBalance);

            console.log(`[🌿] [BLACKJACK-DUELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${winner.username} wins by total`);
          } else {
            console.log(`[🌿] [BLACKJACK-DUELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id}  Duel ended in a tie`);
          }

          return btn.update({
            embeds: [{
              color: 0x00ff00,
              title: '**__♠️ Blackjack Results ♠️__**',
              description: winner
                ? `${winner.username} wins ${ferns}${bet}!`
                : '🤝 It’s a tie!'
            }],
            components: []
          });
        }

        turn = turn === author.id ? opponent.id : author.id;
        await btn.update({ embeds: [makeEmbed()], components: [buttons] });
      });
    });
  }
};
