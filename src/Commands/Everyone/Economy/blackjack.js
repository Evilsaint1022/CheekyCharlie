const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute
const GLOBAL_COOLDOWN_KEY = `blackjack_global`;

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
        const { guild, user } = interaction;
        const bet = interaction.options.getInteger('bet');

        // ✅ Sanitize username for DB keys
        const safeUsername = user.username.replace(/\./g, '_');
        const balanceKey = `${safeUsername}_${user.id}.balance`;

        const ferns = '<:Ferns:1395219665638391818>';

        // 🌐 GLOBAL COOLDOWN CHECK
        const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
        const now = Date.now();

        if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
            console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${safeUsername} tried to use the BlackJack command too quickly.`);
            const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
            return interaction.reply({ content: `⏳ The /blackjack command is on global cooldown. Please wait ${remaining} more seconds.`, flags: 64 });
        }

        // Set the global cooldown
        await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

        console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${safeUsername} used the BlackJack command.`);
        console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${safeUsername} placed a bet of ${bet.toLocaleString()} Ferns.`);


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

        // 🎴 Blackjack logic
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

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
            );

        const embed = {
            color: 0xFFFFFF,
            title: `**__♦️ Blackjack ♦️__**`,
            description: `Placed Bet: ${ferns}${bet.toLocaleString()}\n\n\`Your move: Hit or Stand?\``,
            thumbnail: { url: user.displayAvatarURL() },
            fields: [
                { name: 'Your Cards', value: playerCards.join(', '), inline: true },
                { name: 'Your Total', value: playerTotal.toString(), inline: true },
                { name: `Dealer's Cards`, value: dealerCards[0] + ', ?', inline: false }
            ]
        };

        await interaction.reply({ embeds: [embed], components: [buttons] });
        const message = await interaction.fetchReply();

        const filter = i => i.user.id === user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'hit') {
                playerCards.push(drawCard());
                playerTotal = playerCards.reduce((a, b) => a + b, 0);
            } else if (buttonInteraction.customId === 'stand') {
                while (dealerTotal < 17) {
                    dealerCards.push(drawCard());
                    dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
                }
            }

            const result = checkGameResult();
            if (result) {
                if (result === 'win') {
                    balance += bet;
                    console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${safeUsername} WON +${bet.toLocaleString()} Ferns. New Balance: ${balance.toLocaleString()} Ferns.`);
                } else if (result === 'lose') {
                    balance -= bet;
                    console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${safeUsername} LOST -${bet.toLocaleString()} Ferns. New Balance: ${balance.toLocaleString()} Ferns.`);
                } else {
                    console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${safeUsername} TIED ±0 Ferns. Balance remains: ${balance.toLocaleString()} Ferns.`);
                }

                await db.balance.set(balanceKey, balance);

                const resultEmbed = {
                    color: result === 'win' ? 0x00FF00 : result === 'lose' ? 0xFF0000 : 0xFFFF00,
                    title: `**__♠️ Blackjack Results ♠️__**`,
                    description: `You ${result === 'win' ? 'won' : result === 'lose' ? 'lost' : 'tied'} your bet of ${ferns}${bet.toLocaleString()}`,
                    thumbnail: { url: user.displayAvatarURL() },
                    fields: [
                        { name: 'Your Cards', value: playerCards.join(', '), inline: true },
                        { name: 'Your Total', value: playerTotal.toString(), inline: true },
                        { name: `Dealer's Cards`, value: dealerCards.join(', '), inline: false },
                        { name: `Dealer's Total`, value: dealerTotal.toString(), inline: true },
                        { name: '**__ _New Balance_ __**', value: `${ferns}${balance.toLocaleString()}`, inline: false }
                    ]
                };

                await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
                collector.stop();
            } else {
                const updatedEmbed = {
                    color: 0xFFFFFF,
                    title: `**__♣️ Blackjack ♣️__**`,
                    description: `Placed Bet: ${ferns}${bet.toLocaleString()}\n\n\`Your move: Hit or Stand?\``,
                    thumbnail: { url: user.displayAvatarURL() },
                    fields: [
                        { name: 'Your Cards', value: playerCards.join(', '), inline: true },
                        { name: 'Your Total', value: playerTotal.toString(), inline: true },
                        { name: `Dealer's Cards`, value: dealerCards[0] + ', ?', inline: false }
                    ]
                };

                await buttonInteraction.update({ embeds: [updatedEmbed], components: [buttons] });
            }
        });

        collector.on('end', () => {
            if (!message.editable) return;
            message.edit({ components: [] });
        });
    }
};
