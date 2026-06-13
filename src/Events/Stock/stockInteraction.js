const {
    Events,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const crypto = require('crypto');
const db = require('../../Handlers/database');
const emojis = require('../../Utilities/Stocks/stocks_ui');

const sessions = new Map();
const SESSION_TTL = 5 * 60 * 1000;
const MAX_DIGITS = 7;

function buildKeypadRows(sessionId) {
    const layout = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['x', '0', 'check']
    ];

    return layout.map(row =>
        new ActionRowBuilder().addComponents(
            row.map(value => {
                const btn = new ButtonBuilder().setCustomId(`stock_key_${sessionId}_${value}`);
                if (value === 'check') return btn.setLabel('✔︎').setStyle(ButtonStyle.Success);
                if (value === 'x')     return btn.setLabel('⌫').setStyle(ButtonStyle.Danger);
                return btn.setLabel(value).setStyle(ButtonStyle.Secondary);
            })
        )
    );
}

function buildKeypadContainer(session, sessionId) {
    const { action, input, price, walletBalance, bankBalance, holdings } = session;
    const isBuy = action === 'buy';
    const amount = parseInt(input || '0', 10);
    const cost = Math.round(amount * price);
    const costLabel = isBuy ? 'Cost' : 'Earnings';

    const infoText = isBuy
        ? `### 🛒 Buy FernCoins\n${emojis.ferncoin} Price: **${price.toLocaleString()} Ferns** per FERN\n💰 Wallet: **${walletBalance.toLocaleString()}**  ·  🏦 Bank: **${bankBalance.toLocaleString()}**\n📊 Available: **${(walletBalance + bankBalance).toLocaleString()} Ferns**`
        : `### 💸 Sell FernCoins\n${emojis.ferncoin} Price: **${price.toLocaleString()} Ferns** per FERN\n📦 Your holdings: **${holdings.toLocaleString()} FERN**`;

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(infoText)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `Amount: \`${input || '0'}\` FERN  ·  ${costLabel}: \`${cost.toLocaleString()}\` Ferns`
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(['```', input || ' ', '```'].join('\n'))
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

    buildKeypadRows(sessionId).forEach(row => container.addActionRowComponents(row));

    return container;
}

function buildStatusContainer(content) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );
}

function deleteSessionLater(sessionId) {
    setTimeout(() => sessions.delete(sessionId), SESSION_TTL);
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isButton()) return;

        // ── Open Buy / Sell keypad ──────────────────────────────────────
        if (interaction.customId === 'stock_buy' || interaction.customId === 'stock_sell') {
            const action = interaction.customId === 'stock_buy' ? 'buy' : 'sell';
            const userId = interaction.user.id;

            const stockData = await db.stock.get('global');
            const price = stockData?.price ?? 3000;
            const walletBalance = await db.wallet.get(`${userId}.balance`) || 0;
            const bankBalance = await db.bank.get(`${userId}.bank`) || 0;
            const holdings = await db.stock.get(`${userId}.holdings`) || 0;

            // Clear any existing session for this user to ensure only one keypad is active at a time
            for (const [sid, sess] of sessions.entries()) {
                if (sess.userId === userId) {
                    sessions.delete(sid);
                }
            }

            const sessionId = crypto.randomBytes(8).toString('hex');
            const session = { action, userId, guildId: interaction.guild?.id, input: '', price, walletBalance, bankBalance, holdings };
            sessions.set(sessionId, session);
            deleteSessionLater(sessionId);

            return interaction.reply({
                components: [buildKeypadContainer(session, sessionId)],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
            });
        }

        // ── Keypad presses ──────────────────────────────────────────────
        if (!interaction.customId.startsWith('stock_key_')) return;

        const parts = interaction.customId.split('_');
        // stock_key_{sessionId}_{value}
        const sessionId = parts[2];
        const value = parts[3];
        const session = sessions.get(sessionId);

        if (!session) {
            return interaction.update({
                components: [buildStatusContainer('⏰ This session has expired. Click **Buy** or **Sell** again to start a new one.')],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (session.userId !== interaction.user.id) {
            return interaction.reply({
                content: 'This keypad is not for you.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Backspace
        if (value === 'x') {
            session.input = session.input.slice(0, -1);
            return interaction.update({
                components: [buildKeypadContainer(session, sessionId)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Digit
        if (value !== 'check') {
            if (session.input.length < MAX_DIGITS && !(session.input === '' && value === '0')) {
                session.input += value;
            }
            return interaction.update({
                components: [buildKeypadContainer(session, sessionId)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ── Confirm ─────────────────────────────────────────────────────
        sessions.delete(sessionId);

        const amount = parseInt(session.input || '0', 10);
        if (!amount || amount <= 0) {
            return interaction.update({
                components: [buildStatusContainer('❌ Please enter an amount greater than 0.')],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const { price, userId } = session;
        const { applyPressure } = require('../../Functions/Stock/stock-market');

        if (session.action === 'buy') {
            const cost = Math.round(amount * price);
            const currentWallet = await db.wallet.get(`${userId}.balance`) || 0;
            const currentBank = await db.bank.get(`${userId}.bank`) || 0;
            const totalAvailable = currentWallet + currentBank;

            if (totalAvailable < cost) {
                return interaction.update({
                    components: [buildStatusContainer(
                        `❌ Not enough Ferns.\nYou need **${cost.toLocaleString()}** but have **${totalAvailable.toLocaleString()}** total (wallet + bank).`
                    )],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Deduct from wallet first, overflow into bank
            const walletDeduction = Math.min(currentWallet, cost);
            const bankDeduction = cost - walletDeduction;
            await db.wallet.set(`${userId}.balance`, currentWallet - walletDeduction);
            if (bankDeduction > 0) await db.bank.set(`${userId}.bank`, currentBank - bankDeduction);

            const currentHoldings = await db.stock.get(`${userId}.holdings`) || 0;
            await db.stock.set(`${userId}.holdings`, currentHoldings + amount);

            const prevSpent = await db.stock.get(`${userId}.totalSpent`) || 0;
            await db.stock.set(`${userId}.totalSpent`, prevSpent + cost);

            const prevTrades = await db.stock.get(`${userId}.trades`) || [];
            await db.stock.set(`${userId}.trades`, [
                ...prevTrades.slice(-19),
                { type: 'buy', amount, pricePerFern: price, total: cost, timestamp: Date.now() }
            ]);

            await applyPressure(amount);

            console.log(`[📈] [STOCK BUY] ${interaction.user.username} bought ${amount} FERN for ${cost} Ferns (wallet: ${walletDeduction}, bank: ${bankDeduction})`);

            const sourceLine = bankDeduction > 0
                ? `💰 \`${walletDeduction.toLocaleString()}\` from wallet  ·  🏦 \`${bankDeduction.toLocaleString()}\` from bank`
                : `💰 \`${walletDeduction.toLocaleString()}\` from wallet`;

            return interaction.update({
                components: [buildStatusContainer(
                    `✅ Bought **${amount} FERN** from 🌿 **Fern Exchange** for **${cost.toLocaleString()} Ferns**!\n` +
                    `${sourceLine}\n` +
                    `${emojis.ferncoin} Holdings: **${(currentHoldings + amount).toLocaleString()} FERN**`
                )],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Sell
        const currentHoldings = await db.stock.get(`${userId}.holdings`) || 0;

        if (currentHoldings < amount) {
            return interaction.update({
                components: [buildStatusContainer(
                    `❌ Not enough FERN.\nYou have **${currentHoldings.toLocaleString()} FERN** but tried to sell **${amount.toLocaleString()}**.`
                )],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const earnings = Math.round(amount * price);
        const currentBalance = await db.wallet.get(`${userId}.balance`) || 0;
        await db.stock.set(`${userId}.holdings`, currentHoldings - amount);
        await db.wallet.set(`${userId}.balance`, currentBalance + earnings);

        const prevEarned = await db.stock.get(`${userId}.totalEarned`) || 0;
        await db.stock.set(`${userId}.totalEarned`, prevEarned + earnings);

        const prevTrades = await db.stock.get(`${userId}.trades`) || [];
        await db.stock.set(`${userId}.trades`, [
            ...prevTrades.slice(-19),
            { type: 'sell', amount, pricePerFern: price, total: earnings, timestamp: Date.now() }
        ]);

        await applyPressure(-amount);

        console.log(`[📈] [STOCK SELL] ${interaction.user.username} sold ${amount} FERN for ${earnings} Ferns`);

        return interaction.update({
            components: [buildStatusContainer(
                `✅ Sold **${amount} FERN** to 🌿 **Fern Exchange** for **${earnings.toLocaleString()} Ferns**!\n` +
                `${emojis.ferncoin} Holdings: **${(currentHoldings - amount).toLocaleString()} FERN**  ·  💰 Wallet: **${(currentBalance + earnings).toLocaleString()} Ferns**`
            )],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
