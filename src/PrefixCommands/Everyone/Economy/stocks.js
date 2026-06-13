const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../../Handlers/database');
const emojis = require('../../../Utilities/Stocks/stocks_ui');

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
}

module.exports = {
    name: 'stocks',
    aliases: ['stock', 'fern-market'],

    async execute(message, args) {
        if (!message.guild) return message.reply('This command cannot be used in DMs.');

        const sub = args[0]?.toLowerCase();

        if (!sub || sub === 'portfolio' || sub === 'p') {
            return showPortfolio(message);
        }
        if (sub === 'leaderboard' || sub === 'lb') {
            return showLeaderboard(message);
        }

        return message.reply(
            `❌ Unknown subcommand.\n` +
            `\`?stocks portfolio [@user]\` — view your (or another user's) portfolio\n` +
            `\`?stocks leaderboard\` — top FernCoin holders`
        );
    }
};

// ─────────────────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────────────────
async function showPortfolio(message) {
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;

    console.log(`[📈] [STOCKS PORTFOLIO] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message.guild.name} — ${message.author.username} viewed ${targetUser.username}'s portfolio`);

    const stockData = await db.stock.get('global');
    const currentPrice = stockData?.price ?? 3000;

    const holdings   = await db.stock.get(`${userId}.holdings`)    || 0;
    const totalSpent = await db.stock.get(`${userId}.totalSpent`)   || 0;
    const totalEarned = await db.stock.get(`${userId}.totalEarned`) || 0;
    const trades      = await db.stock.get(`${userId}.trades`)      || [];

    const portfolioValue = holdings * currentPrice;
    const netPnL   = totalEarned + portfolioValue - totalSpent;
    const pnlSign  = netPnL >= 0 ? '+' : '';
    const pnlEmoji = netPnL >= 0 ? '📈' : '📉';
    const embedColor = netPnL >= 0 ? 0x3ddc84 : 0xff5252;

    const tradeHistory = trades.length === 0
        ? '*No trades yet.*'
        : [...trades].reverse().slice(0, 5).map(t => {
            const icon   = t.type === 'buy' ? '🟢' : '🔴';
            const action = t.type === 'buy' ? 'Bought' : 'Sold';
            return `${icon} ${action} **${t.amount.toLocaleString()} FERN** @ \`${Math.round(t.pricePerFern).toLocaleString()}\` · **${t.total.toLocaleString()} Ferns** · *${timeAgo(t.timestamp)}*`;
        }).join('\n');

    const neverTraded = holdings === 0 && totalSpent === 0 && totalEarned === 0;

    const embed = new EmbedBuilder()
        .setColor(neverTraded ? 0x6e7681 : embedColor)
        .setTitle(`${emojis.ferncoin} FernCoin Portfolio`)
        .setAuthor({ name: targetUser.displayName || targetUser.username, iconURL: targetUser.displayAvatarURL() })
        .addFields(
            {
                name: `${emojis.ferncoin} Holdings`,
                value: `\`${holdings.toLocaleString()} FERN\``,
                inline: true
            },
            {
                name: '💱 Current Price',
                value: `\`${Math.round(currentPrice).toLocaleString()} Ferns\``,
                inline: true
            },
            {
                name: '💼 Portfolio Value',
                value: `\`${Math.round(portfolioValue).toLocaleString()} Ferns\``,
                inline: true
            },
            {
                name: '📤 Total Invested',
                value: `\`${totalSpent.toLocaleString()} Ferns\``,
                inline: true
            },
            {
                name: '📥 Total Earned',
                value: `\`${totalEarned.toLocaleString()} Ferns\``,
                inline: true
            },
            {
                name: `${pnlEmoji} Net P&L`,
                value: `\`${pnlSign}${Math.round(netPnL).toLocaleString()} Ferns\``,
                inline: true
            },
            {
                name: `📜 Recent Trades (${trades.length} total)`,
                value: tradeHistory
            }
        )
        .setFooter({ text: 'FernCoin Exchange · ?stocks leaderboard for rankings' })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────
// Leaderboard
// ─────────────────────────────────────────────────────────
async function showLeaderboard(message) {
    console.log(`[📈] [STOCKS LEADERBOARD] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message.guild.name} — ${message.author.username}`);

    const stockData = await db.stock.get('global');
    const currentPrice = stockData?.price ?? 3000;

    const allStock = await db.stock.all();

    const entries = Object.entries(allStock)
        .filter(([key]) => key !== 'global')
        .map(([userId, data]) => {
            if (!data || typeof data !== 'object') return null;
            const holdings = data.holdings || 0;
            if (holdings <= 0) return null;
            const totalSpent  = data.totalSpent  || 0;
            const totalEarned = data.totalEarned || 0;
            const portfolioValue = holdings * currentPrice;
            const netPnL = totalEarned + portfolioValue - totalSpent;
            return { userId, holdings, portfolioValue, netPnL, tradeCount: (data.trades || []).length };
        })
        .filter(Boolean)
        .sort((a, b) => b.portfolioValue - a.portfolioValue);

    const authorRank = entries.findIndex(e => e.userId === message.author.id) + 1;
    const userRankLabel = authorRank > 0 ? `#${authorRank}` : 'Unranked';

    const itemsPerPage = 10;
    const totalPages   = Math.max(1, Math.ceil(entries.length / itemsPerPage));
    let currentPage    = 0;

    const generateEmbed = (page) => {
        const start = page * itemsPerPage;
        const slice = entries.slice(start, start + itemsPerPage);

        const lines = slice.length === 0
            ? '*No FernCoin holders yet.*'
            : slice.map((e, i) => {
                const rank    = start + i + 1;
                const medal   = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
                const pnlSign = e.netPnL >= 0 ? '+' : '';
                const pnlIcon = e.netPnL >= 0 ? '📈' : '📉';
                return (
                    `${medal} <@${e.userId}>\n` +
                    `✦ ${emojis.ferncoin} \`${e.holdings.toLocaleString()} FERN\`  ·  💼 \`${Math.round(e.portfolioValue).toLocaleString()} Ferns\`  ·  ${pnlIcon} \`${pnlSign}${Math.round(e.netPnL).toLocaleString()}\``
                );
            }).join('\n\n');

        return new EmbedBuilder()
            .setTitle(`**╭─── ${emojis.ferncoin} FernCoin Leaderboard ───╮**`)
            .setDescription(lines + `\n\n**╰──────[ Your Rank: ${userRankLabel} ]───────╯**`)
            .setColor(0x207e37)
            .addFields({
                name: '💱 Current Price',
                value: `\`${Math.round(currentPrice).toLocaleString()} Ferns\` per FERN`,
                inline: true
            })
            .setThumbnail(message.guild.iconURL())
            .setFooter({
                text: `Page ${page + 1} of ${totalPages} · FernCoin Exchange`,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTimestamp();
    };

    const buildRow = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lb_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId('lb_stop')
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('lb_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === totalPages - 1)
    );

    const msg = await message.reply({
        embeds: [generateEmbed(currentPage)],
        components: [buildRow()]
    });

    const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async btn => {
        if (btn.user.id !== message.author.id) {
            return btn.reply({ content: "You can't use these buttons.", ephemeral: true });
        }
        if (btn.customId === 'lb_prev' && currentPage > 0) currentPage--;
        if (btn.customId === 'lb_next' && currentPage < totalPages - 1) currentPage++;
        if (btn.customId === 'lb_stop') {
            collector.stop();
            return btn.update({ components: [] });
        }
        await btn.update({ embeds: [generateEmbed(currentPage)], components: [buildRow()] });
    });

    collector.on('end', () => { if (msg.editable) msg.edit({ components: [] }); });
}
