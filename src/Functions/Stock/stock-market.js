const cron = require('node-cron');
const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } = require('discord.js');
const OpenAI = require('openai');
const db = require('../../Handlers/database');
const { generateStockChart } = require('../../Utilities/Stocks/generateChart');
const emojis = require('../../Utilities/Stocks/stocks_ui');

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// const CRON_SCHEDULE = '*/2 * * * *'; // Every 2 minutes for testing
// const EVENT_CHANCE = 0.5; // 50% chance of event every tick for testing
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

// Production settings:
const CRON_SCHEDULE = '*/10 * * * *'; // Every 10 minutes
const HISTORY_MAX = 50;
const STARTING_PRICE = 3000;
const PRICE_TARGET = 3000; // mean-reversion anchor — gravity pulls toward this
// const EVENT_CHANCE = 0.02;

let pendingPressureMemory = 0;

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: 10000
});

const POSITIVE_SCENARIOS = [
    'a major corporation announced they will accept FernCoin as payment',
    'a government officially endorsed FernCoin as legal tender',
    'a breakthrough in FernCoin technology dramatically reduces transaction fees',
    'a famous celebrity publicly invested heavily in FernCoin',
    'a large hedge fund disclosed a massive FernCoin position',
    'FernCoin was listed on a prestigious new exchange',
    'a viral trend caused mass adoption of FernCoin among Gen Z',
    'a major bank announced FernCoin custody services',
    'FernCoin was chosen as the reserve currency for a small nation',
    'a record-breaking FernCoin auction made headlines worldwide',
];

const NEGATIVE_SCENARIOS = [
    'a major government announced strict regulations against FernCoin',
    'a security vulnerability was discovered in the FernCoin network',
    'a prominent FernCoin whale sold off their entire holdings',
    'a whistleblower exposed alleged market manipulation by FernCoin insiders',
    'a competing cryptocurrency launched with superior technology',
    'a high-profile FernCoin scam was uncovered by authorities',
    'the lead FernCoin developer resigned amid controversy',
    'FernCoin was delisted from a major exchange due to compliance issues',
    'a nation banned FernCoin outright, seizing wallets',
    'a major hack drained the FernCoin liquidity pool',
];

async function generateEventText(isPositive) {
    const scenarios = isPositive ? POSITIVE_SCENARIOS : NEGATIVE_SCENARIOS;
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const direction = isPositive ? 'surging' : 'crashing';
    const sentiment = isPositive ? 'optimistic and exciting' : 'alarming and dramatic';

    const prompt =
        `You are a breaking financial news generator for a Discord bot's fictional FernCoin stock market. ` +
        `A market event just occurred: ${scenario}. ` +
        `FernCoin prices are ${direction}. ` +
        `Write a ${sentiment} breaking news alert. ` +
        `Respond with ONLY valid JSON (no markdown, no explanation): ` +
        `{"title": "<short punchy headline, max 60 chars>", "description": "<1-2 dramatic sentences of news detail, max 200 chars>"}`;

    try {
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai/gpt-oss-120b',
            temperature: 1.1,
            max_tokens: 150
        });

        const text = response.choices[0].message.content.trim();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        if (!parsed.title || !parsed.description) throw new Error('Missing fields');
        return { title: parsed.title, description: parsed.description, scenario };
    } catch {
        const fallbackTitle = isPositive ? '📢 Bullish News Breaks!' : '🚨 Breaking: Market Shock!';
        const fallbackDesc = isPositive
            ? `Investors are rushing to buy as FernCoin sentiment turns overwhelmingly positive. Prices spike!`
            : `Panic selling grips the market as confidence in FernCoin wavers. Prices plummet!`;
        return { title: fallbackTitle, description: fallbackDesc, scenario };
    }
}

async function tryFireMarketEvent() {
    if (Math.random() > EVENT_CHANCE) return null;

    const isPositive = Math.random() < 0.5;
    const magnitude = isPositive
        ? 0.20 + Math.random() * 0.40
        : 0.15 + Math.random() * 0.35;

    const eventText = await generateEventText(isPositive);

    return { isPositive, magnitude, ...eventText };
}


async function initStockData() {
    const existing = await db.stock.get('global');
    if (existing && existing.price) return existing;

    const initial = {
        price: STARTING_PRICE,
        history: [STARTING_PRICE],
        trend: 0,
        volatility: 0.04,
        pendingPressure: 0
    };
    await db.stock.set('global', initial);
    return initial;
}

async function tickStock(stockData, pendingPressure) {
    const { price, history, trend } = stockData;

    // Random volatility each tick: 1% – 8%
    const volatility = 0.01 + Math.random() * 0.07;

    // How far above the anchor we are (0 at target, 1 at 2x, 4 at 5x, etc.)
    const priceRatio = price / PRICE_TARGET;

    // Asymmetric gravity: stronger upward pull when below target (creates rebounds),
    // gentler downward pull when above (doesn't choke bull runs as hard)
    const gravityStrength = priceRatio >= 1 ? 0.04 : 0.25;
    const gravity = -((priceRatio - 1) * gravityStrength);

    // Direction biased by trend + gravity, clamped so it never reaches 0 or 1
    // 0.52 base (not 0.5) counteracts volatility drag from asymmetric percentage moves
    const upProb = Math.max(0.15, Math.min(0.85, 0.52 + trend * 0.25 + gravity));
    const direction = Math.random() < upProb ? 1 : -1;

    // Base price movement
    const baseChange = price * volatility * direction;

    // Buy/sell pressure — direct price impact + trend bias
    // Positive pressure (buys) pushes price up and trend bullish; negative (sells) does the opposite
    // Sub-linear scaling using square root to prevent instant doubling by large whale buys
    const pressureDirection = Math.sign(pendingPressure);
    const pressureMagnitude = Math.sqrt(Math.abs(pendingPressure));
    const pressureEffect = pressureDirection * pressureMagnitude * price * 0.003;
    const pressureTrendBias = Math.tanh(pendingPressure / 200) * 0.30;

    // Two-sided market shock (replaces old downward-only dip)
    // Can spike up or down — direction weighted by current trend
    // More likely to shock at price extremes (far from target)
    const shockChance = 0.04 + Math.abs(priceRatio - 1) * 0.03;
    const shockUp = Math.random() < (0.5 + trend * 0.15);
    const shockMagnitude = 0.06 + Math.random() * 0.12; // 6-18% swing
    const shockMult = Math.random() < shockChance
        ? (shockUp ? 1 + shockMagnitude : 1 - shockMagnitude)
        : 1;

    // Keep price as float in database to prevent rounding stall at low values, but clamp non-shock movement to +/- 30% per tick
    const preShockPrice = Math.max(0.1, price + baseChange + pressureEffect);
    const clampedPreShockPrice = Math.min(price * 1.30, Math.max(price * 0.70, preShockPrice));
    const newPrice = Math.max(0.1, clampedPreShockPrice * shockMult);

    // Trend decays faster (0.80) so bull runs need sustained buy pressure to continue
    const newTrend = Math.max(-0.9, Math.min(0.9,
        trend * 0.80 + direction * 0.12 + (Math.random() - 0.5) * 0.08 + pressureTrendBias
    ));

    const newHistory = [...history, newPrice].slice(-HISTORY_MAX);

    return {
        price: newPrice,
        history: newHistory,
        trend: newTrend,
        volatility,
        pendingPressure: 0
    };
}

async function runStockTick(client) {
    if (!client) return;

    if (runStockTick._isRunning) {
        console.log('[📈] [STOCK MARKET] Already running, skipping tick.');
        return;
    }
    runStockTick._isRunning = true;

    try {
        const stockData = await initStockData();
        const prev = stockData.price;

        const pressureToApply = pendingPressureMemory;
        pendingPressureMemory = 0;

        const updated = await tickStock(stockData, pressureToApply);

        const event = await tryFireMarketEvent();
        let eventEmbed = null;

        if (event) {
            const multiplier = event.isPositive ? (1 + event.magnitude) : (1 - event.magnitude);
            const eventPrice = Math.max(0.1, updated.price * multiplier);

            updated.price = eventPrice;
            updated.history[updated.history.length - 1] = eventPrice;
            updated.trend = Math.max(-0.9, Math.min(0.9,
                updated.trend + (event.isPositive ? 0.4 : -0.4)
            ));

            const pctChange = ((eventPrice - prev) / prev * 100).toFixed(1);
            const pctDisplay = event.isPositive ? `+${pctChange}%` : `${pctChange}%`;
            const eventColor = event.isPositive ? 0xffd700 : 0xff3300;
            const eventIcon = event.isPositive ? '📈🚀' : '📉💥';

            eventEmbed = new EmbedBuilder()
                .setColor(eventColor)
                .setTitle(`${eventIcon} MARKET EVENT: ${event.title}`)
                .setDescription(
                    `${event.description}\n\n` +
                    `**Impact:** \`${pctDisplay}\`  ·  **New Price:** \`${Math.round(eventPrice).toLocaleString()} Ferns\``
                )
                .setFooter({ text: 'FernCoin Exchange · Market Event' })
                .setTimestamp();

            console.log(`[📈] [STOCK MARKET EVENT] ${event.isPositive ? 'BULL' : 'BEAR'} — "${event.title}" | ${prev.toFixed(2)} → ${eventPrice.toFixed(2)} (${pctDisplay})`);
        }

        await db.stock.set('global', updated);

        const { price, history, trend, volatility } = updated;

        const change = price - prev;
        const changePct = prev > 0 ? (change / prev) * 100 : 0;
        const isUp = change >= 0;

        const trendEmoji = isUp ? emojis.stocks.up : emojis.stocks.down;
        const changeSign = isUp ? emojis.stocks.plus : emojis.stocks.minus;
        const pctSign = isUp ? emojis.stocks.plus_percent : emojis.stocks.minus_percent;

        const chartBuffer = generateStockChart(history, trend, isUp);
        const attachment = new AttachmentBuilder(chartBuffer, { name: 'ferncoin-chart.png' });

        const trendBar = trend >= 0.5 ? '🟢🟢🟢' :
                         trend >= 0.15 ? '🟢🟢⚪' :
                         trend >= -0.15 ? '⚪⚪⚪' :
                         trend >= -0.5 ? '🔴🔴⚪' :
                                         '🔴🔴🔴';

        const embedColor = isUp ? 0x3ddc84 : 0xff5252;

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${emojis.ferncoin} FernCoin · FERN`)
            .setDescription(
                `### ${trendEmoji} **${Math.round(price).toLocaleString()} Ferns**\n` +
                `${changeSign} \`${Math.abs(change).toFixed(2)}\` | \`${Math.abs(changePct).toFixed(2)}%\` ${pctSign}`
            )
            .addFields(
                {
                    name: '📊 Trend',
                    value: trendBar,
                    inline: true
                }
            )
            .setImage('attachment://ferncoin-chart.png')
            .setFooter({ text: 'FernCoin Exchange' })
            .setTimestamp();

        const tradeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('stock_buy')
                .setLabel('Buy FernCoin')
                .setEmoji({ name: 'FernCoin', id: '1506670591556583464' })
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('stock_sell')
                .setLabel('Sell FernCoin')
                .setEmoji({ name: 'FernCoin', id: '1506670591556583464' })
                .setStyle(ButtonStyle.Danger)
        );

        for (const guild of client.guilds.cache.values()) {
            try {
                const settings = await db.settings.get(`${guild.id}`);
                if (!settings || !settings.stockchannel) continue;

                const channel = guild.channels.cache.get(settings.stockchannel)
                    || await guild.channels.fetch(settings.stockchannel).catch(() => null);

                if (!channel) continue;

                if (!settings.stockeventmessageid) {
                    const neweventMessge = await channel.send({ content: '**📢 Stock market events will appear here!**'}).catch(() => null);

                    if (neweventMessge) {
                        const existing = await db.settings.get(`${guild.id}`) || {};
                        existing.stockeventmessageid = neweventMessge.id;
                        await db.settings.set(`${guild.id}`, existing);
                    }
                }

                // Edit previous message to keep channel clean
                if (settings.stockmessageid) {
                    const oldMsg = await channel.messages.fetch(settings.stockmessageid).catch(() => null);
                    if (oldMsg) await oldMsg.edit({ embeds: [embed], files: [attachment], components: [tradeRow] }).catch(() => null);
                } else {
                    const sent = await channel.send({ embeds: [embed], files: [attachment], components: [tradeRow] });
                    const existing = await db.settings.get(`${guild.id}`) || {};
                    existing.stockmessageid = sent.id;
                    await db.settings.set(`${guild.id}`, existing);
                }

                if (eventEmbed) {
                    const oldeventmessage = settings.stockeventmessageid;
                    const message = await channel.messages.fetch(oldeventmessage).catch(() => null);
                     await message.edit({ content: '**📢 New Stock Market Event!**', embeds: [eventEmbed] }).catch(() => null);
                } else {
                    const oldeventmessage = settings.stockeventmessageid;
                    const message = await channel.messages.fetch(oldeventmessage).catch(() => null);
                     await message.edit({ content: '**📢 No significant market events at this time.**', embeds: [] }).catch(() => null);
                }

            } catch (err) {
                console.warn(`[📈] [STOCK MARKET] Failed for guild ${guild.name}:`, err.message);
            }
        }

        console.log(`[📈] [STOCK MARKET] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] Price: ${prev.toFixed(2)} → ${price.toFixed(2)} (${isUp ? '+' : ''}${change.toFixed(2)}, ${(volatility * 100).toFixed(1)}% vol)`);

    } catch (err) {
        console.error('[📈] [STOCK MARKET] Unhandled error:', err);
    } finally {
        runStockTick._isRunning = false;
    }
}

module.exports = async (client) => {
    if (!client) {
        console.warn('[STOCK MARKET] Client not passed.');
        return;
    }

    cron.schedule(CRON_SCHEDULE, () => runStockTick(client), {
        scheduled: true,
        timezone: 'Pacific/Auckland'
    });

    // On restart: delete the stale message and post a fresh one immediately if ready, or wait
        await new Promise(resolve => setTimeout(resolve, 5000));

        if (client.isReady()) {
            console.log('[📈] [STOCK MARKET] Scheduler started.');
            runStockTick(client);
        } else {
            client.once('ready', () => {
                console.log('[📈] [STOCK MARKET] Scheduler started.');
                runStockTick(client);
            });
        }
};

module.exports.applyPressure = async (amount) => {
    pendingPressureMemory += amount;
};
