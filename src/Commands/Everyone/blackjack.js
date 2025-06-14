const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../Handlers/database');
const SimpleDeck = require('../../Utilities/Cards/SimpleDeck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack and bet your balance!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const { guild, user } = interaction;
        const bet = interaction.options.getInteger('bet');
        const safeUsername = user.username.replace(/\./g, '_');
        const balanceKey = `${safeUsername}_${user.id}.balance`;

        // Retrieve balance
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

        const deck = new SimpleDeck();
        deck.shuffle();

        const playerCards = [deck.draw(), deck.draw()];
        const dealerCards = [deck.draw(), deck.draw()];

        const calculateTotal = (cards) => {
            let total = 0, aces = 0;
            for (const card of cards) {
                if (['JACK', 'QUEEN', 'KING'].includes(card.rank)) total += 10;
                else if (card.rank === 'ACE') { total += 11; aces++; }
                else total += parseInt(card.rank);
            }
            while (total > 21 && aces > 0) { total -= 10; aces--; }
            return total;
        };

        let playerTotal = calculateTotal(playerCards);
        let dealerTotal = calculateTotal(dealerCards);

        const checkGameResult = () => {
            if (playerTotal > 21) return 'lose';
            if (dealerTotal > 21) return 'win';
            if (dealerTotal >= 17 && playerTotal > dealerTotal) return 'win';
            if (dealerTotal >= 17 && playerTotal < dealerTotal) return 'lose';
            if (dealerTotal >= 17 && playerTotal === dealerTotal) return 'tie';
            return null;
        };

        const suitEmojis = {
            'HEARTS': '❤️', 'DIAMONDS': '♦️', 'CLUBS': '♣️', 'SPADES': '♠️'
        };
        const rankSymbols = {
            'ACE': 'A', '2': '2', '3': '3', '4': '4', '5': '5',
            '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
            'JACK': 'J', 'QUEEN': 'Q', 'KING': 'K'
        };
        const formatCards = (cards) => cards.map(c => `${rankSymbols[c.rank]}${suitEmojis[c.suit]}`).join(', ');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
        );

        const isPlayerBlackjack = (playerCards.length === 2 && playerTotal === 21);
        if (isPlayerBlackjack) {
            balance += bet * 1.5;
            await db.balance.set(balanceKey, balance);
            await interaction.reply({
                embeds: [{
                    color: 0xFFD700,
                    title: `**__♠️ Blackjack! ♠️__**`,
                    description: `You hit **Blackjack** and win ${bet * 1.5} Coins 🪙!`,
                    thumbnail: { url: user.displayAvatarURL() },
                    fields: [
                        { name: 'Your Cards', value: formatCards(playerCards), inline: true },
                        { name: 'Your Total', value: playerTotal.toString(), inline: true },
                        { name: `Dealer's Cards`, value: formatCards(dealerCards), inline: false },
                        { name: `Dealer's Total`, value: dealerTotal.toString(), inline: true },
                        { name: '**__Your Balance__**', value: balance.toString(), inline: false }
                    ]
                }]
            });
            console.log(`[${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${user.username} hit Blackjack.`);
            return;
        }

        await interaction.reply({
            embeds: [{
                color: 0xFFFFFF,
                title: `**__♦️ Blackjack ♦️__**`,
                description: `Placed Bet: ${bet} Coins 🪙\n\`Your move: Hit or Stand?\``,
                thumbnail: { url: user.displayAvatarURL() },
                fields: [
                    { name: 'Your Cards', value: formatCards(playerCards), inline: true },
                    { name: 'Your Total', value: playerTotal.toString(), inline: true },
                    { name: `Dealer's Cards`, value: `${rankSymbols[dealerCards[0].rank]}${suitEmojis[dealerCards[0].suit]}, ?`, inline: false }
                ]
            }],
            components: [buttons]
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === user.id,
            time: 60000
        });

        collector.on('collect', async (btnInt) => {
            if (btnInt.customId === 'hit') {
                playerCards.push(deck.draw());
                playerTotal = calculateTotal(playerCards);
            } else if (btnInt.customId === 'stand') {
                while (dealerTotal < 17) {
                    dealerCards.push(deck.draw());
                    dealerTotal = calculateTotal(dealerCards);
                }
            }

            const result = checkGameResult();
            if (result) {
                if (result === 'win') balance += bet;
                else if (result === 'lose') balance -= bet;

                await db.balance.set(balanceKey, balance);

                await btnInt.update({
                    embeds: [{
                        color: result === 'win' ? 0x00FF00 : result === 'lose' ? 0xFF0000 : 0xFFFF00,
                        title: `**__♠️ Blackjack Results ♠️__**`,
                        description: `You ${result === 'win' ? 'won' : result === 'lose' ? 'lost' : 'tied'} your bet of ${bet} Coins 🪙!`,
                        thumbnail: { url: user.displayAvatarURL() },
                        fields: [
                            { name: 'Your Cards', value: formatCards(playerCards), inline: true },
                            { name: 'Your Total', value: playerTotal.toString(), inline: true },
                            { name: `Dealer's Cards`, value: formatCards(dealerCards), inline: false },
                            { name: `Dealer's Total`, value: dealerTotal.toString(), inline: true },
                            { name: '**__Your Balance__**', value: balance.toString(), inline: false }
                        ]
                    }],
                    components: []
                });

                collector.stop();
            } else {
                await btnInt.update({
                    embeds: [{
                        color: 0xFFFFFF,
                        title: `**__♣️ Blackjack ♣️__**`,
                        description: `Bet Placed: ${bet} Coins 🪙\n\`Your move: Hit or Stand?\``,
                        thumbnail: { url: user.displayAvatarURL() },
                        fields: [
                            { name: 'Your Cards', value: formatCards(playerCards), inline: true },
                            { name: 'Your Total', value: playerTotal.toString(), inline: true },
                            { name: `Dealer's Cards`, value: `${rankSymbols[dealerCards[0].rank]}${suitEmojis[dealerCards[0].suit]}, ?`, inline: false }
                        ]
                    }],
                    components: [buttons]
                });
            }
        });

        collector.on('end', async (collected) => {
            if (!message.editable) return;
            if (collected.size === 0) {
                await message.edit({ content: '⏳ Time expired! Game cancelled.', components: [] });
            } else {
                await message.edit({ components: [] });
            }
        });

        console.log(`[${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${user.username} used the BlackJack command.`);
    }
};
