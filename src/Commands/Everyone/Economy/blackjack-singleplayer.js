const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute
const GLOBAL_COOLDOWN_KEY = `blackjack_singleplayer`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack-singleplayer')
        .setDescription('Play a game of blackjack and bet your balance!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)
        ),

    async execute(interaction) {
        const { guild, user } = interaction;
        const bet = interaction.options.getInteger('bet');
        const ferns = '<:Ferns:1395219665638391818>';

        // 🌐 GLOBAL COOLDOWN CHECK
        const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
        const now = Date.now();

        if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
            const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
            console.log(`[♠️] [BLACKJACK-SINGLEPLAYER] [${guild.name}_${guild.id}] ${user.username} tried to use the blackjack-duels commmand too quickly.`);
            return interaction.reply({
                   content: `⏳ The /blackjack command is on global cooldown. Please wait ${remaining} more seconds.`, 
                   flags: 64 
                });
        }

        await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

        // ------------------------------------------------------
        // 🔄 1️⃣ MIGRATION — move username_userid → userid
        // ------------------------------------------------------
        const safeUsername = user.username.replace(/\./g, '_');
        const oldKey = `${safeUsername}_${user.id}`; // old format
        const newKey = `${user.id}`;                // new format

        // Attempt loading using new system
        let walletObj = await db.wallet.get(newKey);

        if (walletObj === undefined) {
            const oldWalletObj = await db.wallet.get(oldKey);

            if (oldWalletObj !== undefined) {
                // Move object
                await db.wallet.set(newKey, oldWalletObj);
                await db.wallet.delete(oldKey);

                console.log(`[MIGRATION] Wallet migrated ${oldKey} → ${newKey}`);

                walletObj = oldWalletObj;
            }
        }

        // Still missing wallet?
        if (!walletObj || typeof walletObj !== "object") {
            return interaction.reply({
                content: `You don't have a wallet record yet.`,
                flags: 64
            });
        }

        // Extract balance from object
        let balance = parseInt(walletObj.balance);

        if (isNaN(balance)) {
            return interaction.reply({
                content: `Your wallet is missing a valid balance. Please contact an admin.`,
                flags: 64
            });
        }

        // ------------------------------------------------------

        if (bet > balance) {
            console.log(`[♠️] [BLACKJACK_SINGLEPLAYER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} didn't have enough balance to bet ferns ${bet.toLocaleString()}.`);
            return interaction.reply({ content: `You don't have enough balance to place this bet.`, flags: 64 });
        } else if (bet <= 0) {
            console.log(`[♠️] [BLACKJACK_SINGLEPLAYER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} tried to bet an invalid amount of ferns ${bet.toLocaleString()}.`);
            return interaction.reply({ content: `Bet amount must be greater than zero.`, flags: 64 });
        }

        console.log(`[♠️] [BLACKJACK_SINGLEPLAYER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} - ${user.username} used the blackjack-singleplayer command and bet ferns ${bet.toLocaleString()}.`);

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
                // Player draws one card
                playerCards.push(drawCard());
                playerTotal = playerCards.reduce((a, b) => a + b, 0);

            } else if (buttonInteraction.customId === 'stand') {
                // Dealer must finish playing immediately
                while (dealerTotal < 17) {
                    dealerCards.push(drawCard());
                    dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
                }

                // Lock player actions after standing
                collector.stop('stood');
            }

            // Always check for win/lose/tie after any action
            const result = checkGameResult();

            // If Stand was pressed, result will always resolve now
            if (result || buttonInteraction.customId === 'stand') {

                const finalResult = result || checkGameResult();

                if (finalResult === 'win') {
                    balance += bet;
                    console.log(`[♠️] [BLACKJACK_SINGLEPLAYER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} - ${user.username} Won +${bet.toLocaleString()} Ferns.`);
                } else if (finalResult === 'lose') {
                    balance -= bet;
                    console.log(`[♠️] [BLACKJACK_SINGLEPLAYER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} - ${user.username} Lost -${bet.toLocaleString()} Ferns.`);
                }

                walletObj.balance = balance;
                await db.wallet.set(newKey, walletObj);

                const resultEmbed = {
                    color: finalResult === 'win' ? 0x00FF00 : finalResult === 'lose' ? 0xFF0000 : 0xFFFF00,
                    title: `**__♠️ Blackjack Results ♠️__**`,
                    description: `You ${finalResult === 'win' ? 'won' : finalResult === 'lose' ? 'lost' : 'tied'} your bet of ${ferns}${bet.toLocaleString()}`,
                    thumbnail: { url: user.displayAvatarURL() },
                    fields: [
                        { name: 'Your Cards', value: playerCards.join(', '), inline: true },
                        { name: 'Your Total', value: playerTotal.toString(), inline: true },
                        { name: `Dealer's Cards`, value: dealerCards.join(', '), inline: false },
                        { name: `Dealer's Total`, value: dealerTotal.toString(), inline: true },
                        { name: '**__ _New Balance_ __**', value: `${ferns}${balance.toLocaleString()}`, inline: false }
                    ]
                };

                await buttonInteraction.update({
                    embeds: [resultEmbed],
                    components: [] // disable buttons
                });

                return;
            }

            // If no final result yet (player hit), show updated status
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

        });


        collector.on('end', () => {
            if (!message.editable) return;
            message.edit({ components: [] });
        });
    }
};
