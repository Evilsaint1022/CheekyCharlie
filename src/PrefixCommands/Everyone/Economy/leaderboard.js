const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const db = require('../../../Handlers/database');
const stockEmojis = require('../../../Utilities/Stocks/stocks_ui');

module.exports = {
  name: "leaderboard",
  aliases: ["lb"],
  description: "Displays the leaderboard",

  /**
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    
    if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const type = args[0]?.toLowerCase();
    const validTypes = ["wallet", "bank", "money", "level", "stocks"];

    if (!validTypes.includes(type)) {
      return message.reply(
        "❌ Invalid leaderboard type.\n" +
        "**Usage:** `?leaderboard wallet | bank | money | level | stocks`"
      );
    }

    const guildKey = `${message.guild.id}`;

    console.log(
      `[🌿] [LEADERBOARD] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${message.guild.name} (${message.guild.id}) | ` +
      `${message.author.tag} used '${type}' leaderboard`
    );

    let entries = [];

    // ------------------------------
    // WALLET
    // ------------------------------
    if (type === 'wallet') {
      const allKeys = await db.wallet.keys();

      entries = (await Promise.all(
        allKeys
          .filter(key => key.endsWith('.balance'))
          .map(async key => {
            const userId = key.replace('.balance', '').split('_').pop();
            const balance = await db.wallet.get(key) || 0;

            return {
              userId,
              username: `<@${userId}>`,
              stat: balance
            };
          })
      )).sort((a, b) => b.stat - a.stat);
    }

    // ------------------------------
    // BANK
    // ------------------------------
    else if (type === 'bank') {
      const allKeys = await db.bank.keys();

      entries = (await Promise.all(
        allKeys
          .filter(key => key.endsWith('.bank'))
          .map(async key => {
            const userId = key.replace('.bank', '').split('_').pop();
            const bankBalance = await db.bank.get(key) || 0;

            return {
              userId,
              username: `<@${userId}>`,
              stat: bankBalance
            };
          })
      )).sort((a, b) => b.stat - a.stat);
    }

    // ------------------------------
    // LEVEL
    // ------------------------------
    else if (type === 'level') {
      const levelData = await db.levels.get(guildKey) || {};

      entries = Object.entries(levelData)
        .map(([key, data]) => {
          const userId = key.split('_').pop();

          return {
            userId,
            username: `<@${userId}>`,
            stat: data.level || 0,
            xp: data.xp || 0
          };
        })
        .sort((a, b) => {
          if (b.stat === a.stat) return b.xp - a.xp;
          return b.stat - a.stat;
        });
    }

    // ------------------------------
    // MONEY (wallet + bank)
    // ------------------------------
    else if (type === 'money') {
      const balanceKeys = await db.wallet.keys();
      const bankKeys = await db.bank.keys();

      const allIds = new Set([
        ...balanceKeys
          .filter(k => k.endsWith('.balance'))
          .map(k => k.replace('.balance', '').split('_').pop()),
        ...bankKeys
          .filter(k => k.endsWith('.bank'))
          .map(k => k.replace('.bank', '').split('_').pop())
      ]);

      for (const userId of allIds) {
        const walletKey = balanceKeys.find(k => k.includes(`${userId}.balance`));
        const bankKey = bankKeys.find(k => k.includes(`${userId}.bank`));

        const balance = walletKey ? await db.wallet.get(walletKey) || 0 : 0;
        const bank = bankKey ? await db.bank.get(bankKey) || 0 : 0;

        entries.push({
          userId,
          username: `<@${userId}>`,
          stat: balance + bank
        });
      }

      entries.sort((a, b) => b.stat - a.stat);
    }

    // ------------------------------
    // STOCKS (portfolio value)
    // ------------------------------
    else if (type === 'stocks') {
      const stockData = await db.stock.get('global') || `No Data Found`;
      const currentPrice = stockData?.price ?? 3000;

      const allStock = await db.stock.all();
      for (const [userId, data] of Object.entries(allStock)) {
        if (userId === 'global' || !data || typeof data !== 'object') continue;
        const holdings = data.holdings || 0;
        if (holdings <= 0) continue;
        const totalSpent  = data.totalSpent  || 0;
        const totalEarned = data.totalEarned || 0;
        const portfolioValue = holdings * currentPrice;
        entries.push({
          userId,
          username: `<@${userId}>`,
          stat: portfolioValue,
          holdings,
          netPnL: totalEarned + portfolioValue - totalSpent
        });
      }
      entries.sort((a, b) => b.stat - a.stat);
    }

    // ------------------------------
    // USER RANK
    // ------------------------------
    const userEntry = entries.find(e => e.userId === message.author.id);
    const userRank = userEntry ? entries.indexOf(userEntry) + 1 : "Unranked";

    // ------------------------------
    // EMBEDS
    // ------------------------------
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(entries.length / itemsPerPage));
    let currentPage = 0;

    const labels = {
      wallet: "Wallet",
      bank: "Bank",
      money: "Money",
      level: "Level",
      stocks: "FernCoin"
    };

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;

      const leaderboard = entries
        .slice(start, start + itemsPerPage)
        .map((entry, idx) => {
          const base = `**__${start + idx + 1}.__  ${entry.username}**`;

          if (type === 'level') {
            return `${base}\n✦  🎉・Level ${entry.stat}・\`${entry.xp} XP\``;
          }

          if (type === 'stocks') {
            const pnlSign = entry.netPnL >= 0 ? '+' : '';
            const pnlIcon = entry.netPnL >= 0 ? '📈' : '📉';
            return `${base}\n✦  ${stockEmojis.ferncoin}・\`${entry.holdings.toLocaleString()} FERN\`  ·  💼 \`${entry.stat.toLocaleString()} Ferns\`  ·  ${pnlIcon} \`${pnlSign}${entry.netPnL.toLocaleString()}\``;
          }

          return `${base}\n✦  💰・${entry.stat.toLocaleString()}`;
        })
        .join('\n\n');

      return new EmbedBuilder()
        .setTitle(`**╭─── 🌿 ${labels[type]} Leaderboard 🌿 ───╮**`)
        .setDescription(
          (leaderboard || "*No users found.*") +
          `\n\n**╰─────────[ Your Rank: #${userRank} ]──────────╯**`
        )
        .setColor(0x207e37)
        .setThumbnail(message.guild.iconURL())
        .setFooter({
          text: `Page ${page + 1} of ${totalPages}`,
          iconURL: message.client.user.displayAvatarURL()
        })
        .setTimestamp();
    };

    // ------------------------------
    // BUTTONS
    // ------------------------------
    const row = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),

        new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages - 1)
      );

    const msg = await message.reply({
      embeds: [generateEmbed(currentPage)],
      components: [row()]
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== message.author.id) {
        return btn.reply({
          content: "You're not allowed to use these buttons.",
          ephemeral: true
        });
      }

      if (btn.customId === 'previous' && currentPage > 0) currentPage--;
      if (btn.customId === 'next' && currentPage < totalPages - 1) currentPage++;
      if (btn.customId === 'stop') {
        collector.stop();
        return btn.update({ components: [] });
      }

      await btn.update({
        embeds: [generateEmbed(currentPage)],
        components: [row()]
      });
    });

    collector.on('end', () => {
      if (msg.editable) msg.edit({ components: [] });
    });
  }
};
