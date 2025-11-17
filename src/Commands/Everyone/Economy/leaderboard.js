const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription("Displays The Leaderboard")
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Which leaderboard would you like to see?')
        .setRequired(true)
        .addChoices(
          { name: "Wallet", value: "wallet" },
          { name: 'Bank', value: 'bank' },
          { name: 'Money', value: 'money' },
          { name: 'Level', value: 'level' }
        )
    ),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const type = interaction.options.getString('type');
    const guildKey = `${interaction.guild.name}_${interaction.guild.id}`;

    console.log(`[🌿 LEADERBOARD] ${interaction.guild.name} (${interaction.guild.id}) | ${interaction.user.tag} used '${type}' leaderboard`);

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
            const rawKey = key.replace('.balance', '');
            const userId = rawKey.split('_').pop(); // only ID
            const balance = await db.wallet.get(key) || 0;

            return {
              userId,
              username: `<@${userId}>`,
              safeKey: userId,
              stat: balance
            };
          })
      )).sort((a, b) => b.stat - a.stat);
    }

    // ------------------------------
    // BANK
    // ------------------------------
    else if (type === "bank") {
      const allKeys = await db.bank.keys();

      entries = (await Promise.all(
        allKeys
          .filter(key => key.endsWith('.bank'))
          .map(async key => {
            const rawKey = key.replace('.bank', '');
            const userId = rawKey.split('_').pop();
            const bankBalance = await db.bank.get(key) || 0;

            return {
              userId,
              username: `<@${userId}>`,
              safeKey: userId,
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
          const userId = key.split('_').pop(); // extract only ID

          return {
            userId,
            username: `<@${userId}>`,
            safeKey: userId,
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
        ...balanceKeys.filter(k => k.endsWith('.balance')).map(k => k.replace('.balance', '').split('_').pop()),
        ...bankKeys.filter(k => k.endsWith('.bank')).map(k => k.replace('.bank', '').split('_').pop())
      ]);

      entries = [];

      for (const userId of allIds) {
        const balance = await db.wallet.get(`user_${userId}.balance`) || 0;
        const bank = await db.bank.get(`user_${userId}.bank`) || 0;

        entries.push({
          userId,
          username: `<@${userId}>`,
          safeKey: userId,
          stat: balance + bank
        });
      }

      entries.sort((a, b) => b.stat - a.stat);
    }

    // ------------------------------
    // USER RANKING (ID-BASED)
    // ------------------------------
    const userEntry = entries.find(entry => entry.userId === interaction.user.id);
    const userRank = userEntry ? entries.indexOf(userEntry) + 1 : "Unranked";

    // ------------------------------
    // EMBED GENERATION
    // ------------------------------
    const itemsPerPage = 10;
    const totalPages = Math.ceil(entries.length / itemsPerPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;

      const leaderboard = entries.slice(start, start + itemsPerPage)
        .map((entry, idx) => {
          const base = `**__${start + idx + 1}.__  ${entry.username}**`;

          if (type === 'level') {
            return `${base}\n✦  🎉・Level ${entry.stat}・\`${entry.xp} XP\``;
          } else {
            return `${base}\n✦  💰・${entry.stat.toLocaleString()}`;
          }
        })
        .join('\n\n');

      const labels = {
        wallet: "Wallet",
        bank: "Bank",
        money: "Money",
        level: "Level"
      };

      return new EmbedBuilder()
        .setTitle(`**╭─── 🌿 ${labels[type]} Leaderboard 🌿 ───╮**`)
        .setDescription(
          (leaderboard || "*No users found.*") +
          `\n\n**╰─────────[ Your Rank: #${userRank} ]──────────╯**`
        )
        .setColor('#de4949')
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({
          text: `Page ${page + 1} of ${totalPages}`,
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();
    };

    // ------------------------------
    // PAGINATION
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

    await interaction.reply({
      embeds: [generateEmbed(currentPage)],
      components: [row()]
    });

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: "You're not allowed to use these buttons.", flags: 64 });
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
