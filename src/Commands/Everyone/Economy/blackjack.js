const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

const COOLDOWN_TIME = 60 * 1000; // 1 minute
const GLOBAL_COOLDOWN_KEY = `blackjack_global`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Challenge another member to a blackjack game and bet your balance!')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('The member you want to challenge')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)
        ),

    async execute(interaction) {
        const { guild, user } = interaction;
        const opponent = interaction.options.getUser('opponent');
        const bet = interaction.options.getInteger('bet');

        // ✅ Sanitize usernames
        const safeChallenger = user.username.replace(/\./g, '_');
        const safeOpponent = opponent.username.replace(/\./g, '_');
        const balanceKeyChallenger = `${safeChallenger}_${user.id}.balance`;
        const balanceKeyOpponent = `${safeOpponent}_${opponent.id}.balance`;

        const ferns = '<:Ferns:1395219665638391818>';

        // 🌐 GLOBAL COOLDOWN CHECK
        const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
        const now = Date.now();

        if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
            console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${safeChallenger} tried to use the BlackJack command too quickly.`);
            const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
            return interaction.reply({ content: `⏳ The /blackjack command is on global cooldown. Please wait ${remaining} more seconds.`, flags: 64 });
        }

        // Set the global cooldown
        await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

        if (opponent.bot || opponent.id === user.id) {
            return interaction.reply({ content: `❌ You Cant Challenge Bots or Yourself`, flags: 64 });
        }

        // ✅ Load balances
        let challengerBalance = parseInt(await db.balance.get(balanceKeyChallenger) ?? 0);
        let opponentBalance = parseInt(await db.balance.get(balanceKeyOpponent) ?? 0);

        if (challengerBalance < bet) {
            return interaction.reply({ content: `❌ You don’t have enough balance to bet ${ferns}${bet}.`, flags: 64 });
        }
        if (opponentBalance < bet) {
            return interaction.reply({ content: `❌ ${opponent.username} doesn’t have enough balance to match this bet.`, flags: 64 });
        }
        if (bet <= 0) {
            return interaction.reply({ content: `❌ Bet amount must be greater than zero.`, flags: 64 });
        }

        // Ask opponent to accept
        console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${user.username} challenged ${opponent.username} to Blackjack for ${bet} ferns.`);

        const inviteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ 
            content: `${opponent}, you’ve been challenged to a blackjack game by ${user} for ${ferns}${bet.toLocaleString()}! Do you accept?`, 
            components: [inviteRow] 
        });

        const inviteMsg = await interaction.fetchReply();

        const filter = i => i.user.id === opponent.id;
        const inviteCollector = inviteMsg.createMessageComponentCollector({ filter, time: 30000 });

        inviteCollector.on('collect', async (btn) => {
            if (btn.customId === 'decline') {
                await btn.update({ content: `${opponent.username} declined the blackjack challenge.`, components: [] });
                console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${user.username} declined ${opponent.username}'s blackjack challenge.`);
                inviteCollector.stop();
                return;
            }

            if (btn.customId === 'accept') {
                await btn.update({ content: `✅ Challenge accepted! Starting blackjack...`, components: [] });
                inviteCollector.stop();

                // 🎴 Blackjack vs Player
                const drawCard = () => Math.floor(Math.random() * 10) + 1;

                let challengerCards = [drawCard(), drawCard()];
                let opponentCards = [drawCard(), drawCard()];

                const calcTotal = (cards) => cards.reduce((a, b) => a + b, 0);

                let challengerTotal = calcTotal(challengerCards);
                let opponentTotal = calcTotal(opponentCards);

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
                );

                let turn = user.id; // challenger starts

                const makeEmbed = () => ({
                    color: 0xFFFFFF,
                    title: `**__♦️ Blackjack Duel ♦️__**`,
                    description: `${user.username} vs ${opponent.username}\n\nBet: ${ferns}${bet.toLocaleString()}`,
                    fields: [
                        { name: `${user.username}'s Cards`, value: challengerCards.join(', '), inline: false },
                        { name: `${user.username}'s Total`, value: challengerTotal.toString(), inline: false },
                        { name: `${opponent.username}'s Cards`, value: opponentCards.join(', '), inline: false },
                        { name: `${opponent.username}'s Total`, value: opponentTotal.toString(), inline: false },
                        { name: `Turn`, value: `<@${turn}>`, inline: false }
                    ]
                });

                const gameMsg = await interaction.followUp({ embeds: [makeEmbed()], components: [buttons] });

                const collector = gameMsg.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async (btn) => {
                    if (btn.user.id !== turn) {
                        return btn.reply({ content: `❌ It’s not your turn!`, flags: 64 });
                    }

                    let currentCards = turn === user.id ? challengerCards : opponentCards;
                    let currentTotal = calcTotal(currentCards);

                    if (btn.customId === 'hit') {
                        currentCards.push(drawCard());
                        currentTotal = calcTotal(currentCards);
                    } else if (btn.customId === 'stand') {
                        turn = turn === user.id ? opponent.id : user.id;
                    }

                    challengerTotal = calcTotal(challengerCards);
                    opponentTotal = calcTotal(opponentCards);

                    // Bust check
                    let winner = null;
                    if (challengerTotal > 21) winner = opponent.id;
                    if (opponentTotal > 21) winner = user.id;

                    if (winner) {
                        let winUser = winner === user.id ? user : opponent;
                        let loseUser = winner === user.id ? opponent : user;

                        if (winner === user.id) {
                            challengerBalance += bet;
                            opponentBalance -= bet;
                        } else {
                            challengerBalance -= bet;
                            opponentBalance += bet;
                        }

                        await db.balance.set(balanceKeyChallenger, challengerBalance);
                        await db.balance.set(balanceKeyOpponent, opponentBalance);

                        console.log(`[♦️] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} 🏆 ${winUser.username} wins ${bet}!`);

                        const resultEmbed = {
                            color: winner === user.id ? 0x00FF00 : 0xFF0000,
                            title: `**__♠️ Blackjack Results ♠️__**`,
                            description: `${winUser.username} wins ${ferns}${bet.toLocaleString()}!`,
                            fields: [
                                { name: `${user.username}'s Final`, value: `${challengerCards.join(', ')} (Total: ${challengerTotal})`, inline: false },
                                { name: `${opponent.username}'s Final`, value: `${opponentCards.join(', ')} (Total: ${opponentTotal})`, inline: false },
                                { name: `${user.username}'s Balance`, value: `${ferns}${challengerBalance.toLocaleString()}`, inline: false },
                                { name: `${opponent.username}'s Balance`, value: `${ferns}${opponentBalance.toLocaleString()}`, inline: false },
                            ]
                        };

                        await btn.update({ embeds: [resultEmbed], components: [] });
                        collector.stop();
                        return;
                    }

                    // Switch turn after a successful move
                    if (btn.customId === 'hit') {
                        turn = turn === user.id ? opponent.id : user.id;
                    }

                    await btn.update({ embeds: [makeEmbed()], components: [buttons] });
                });

                collector.on('end', () => {
                    if (!gameMsg.editable) return;
                    gameMsg.edit({ components: [] });
                });
            }
        });

        inviteCollector.on('end', async (collected) => {
            if (!inviteMsg.editable) return;
            if (collected.size === 0) {
                await inviteMsg.edit({ content: `⌛ ${opponent.username} did not respond in time. Challenge expired.`, components: [] });
            } else {
                await inviteMsg.edit({ components: [] });
            }
        });
    }
};
