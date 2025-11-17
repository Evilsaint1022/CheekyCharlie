const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
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
          { name: "Wallet", value: "wallet"},
          { name: 'Bank', value: 'bank' },
          { name: 'Money', value: 'money' },
          { name: 'Level', value: 'level' }
        )
    ),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64,
      });
    }

    const type = interaction.options.getString('type');
    const guildKey = `${interaction.guild.name}_${interaction.guild.id}`;
    const safeUsername = interaction.user.username.replace(/\./g, '_');
    const displayKey = `${safeUsername}_${interaction.user.id}`;

    console.log(`[🌿] [LEADERBOARD] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${interaction.guild.name} ${interaction.guild.id} ${interaction.user.username} used the leaderboard command for '${type}'.`);

    let entries = [];

    if (type === 'wallet') {
      const allKeys = await db.wallet.keys();
      entries = (await Promise.all(
        allKeys
          .filter(key => key.endsWith('.balance'))
          .map(async key => {
            const rawKey = key.slice(0, -('.balance'.length));
            const lastUnderscoreIndex = rawKey.lastIndexOf('_');
            const safeUsername = rawKey.slice(0, lastUnderscoreIndex);
            const userId = rawKey.slice(lastUnderscoreIndex + 1);
            const balance = await db.wallet.get(key) || 0;
            return {
              userId,
              username: safeUsername.replace(/_/g, '.'),
              safeKey: `${safeUsername}_${userId}`,
              stat: balance,
            };
          })
      )).sort((a, b) => b.stat - a.stat);
    } else if ( type === "bank") {
      const allKeys = await db.bank.keys();
      entries = (await Promise.all(
        allKeys
          .filter(key => key.endsWith('.bank'))
          .map(async key => {
            const rawKey = key.slice(0, -('.bank'.length));
            const lastUnderscoreIndex = rawKey.lastIndexOf('_');
            const safeUsername = rawKey.slice(0, lastUnderscoreIndex);
            const userId = rawKey.slice(lastUnderscoreIndex + 1);
            const bankBalance = await db.bank.get(key) || 0;
            return {
              userId,
              username: safeUsername.replace(/_/g, '.'),
              safeKey: `${safeUsername}_${userId}`,
              stat: bankBalance,
            };
          })
      )).sort((a, b) => b.stat - a.stat);
    } else if (type === 'level') {
      const levelData = await db.levels.get(guildKey) || {};
      entries = Object.entries(levelData).map(([key, data]) => {
        const lastUnderscoreIndex = key.lastIndexOf('_');
        const safeUsername = key.slice(0, lastUnderscoreIndex);
        const userId = key.slice(lastUnderscoreIndex + 1);
        return {
          userId,
          username: safeUsername.replace(/_/g, '.'),
          safeKey: key,
          stat: data.level || 0,
          xp: data.xp || 0,
        };
      })
      .sort((a, b) => {
        if (b.stat === a.stat) {
          return b.xp - a.xp; // higher XP wins when levels are equal
        }
        return b.stat - a.stat; // higher level first
      });
    } else if (type === 'money') {
      const balanceKeys = await db.wallet.keys();
      const bankKeys = await db.bank.keys();
      const allKeys = new Set([...balanceKeys.filter(k => k.endsWith('.balance')).map(k => k.slice(0, -8)), ...bankKeys.filter(k => k.endsWith('.bank')).map(k => k.slice(0, -5))]);
      entries = [];
      for (const key of allKeys) {
        const balance = await db.wallet.get(`${key}.balance`) || 0;
        const bank = await db.bank.get(`${key}.bank`) || 0;
        const total = balance + bank;
        const lastUnderscoreIndex = key.lastIndexOf('_');
        const safeUsername = key.slice(0, lastUnderscoreIndex);
        const userId = key.slice(lastUnderscoreIndex + 1);
        entries.push({
          userId,
          username: safeUsername.replace(/_/g, '.'),
          safeKey: key,
          stat: total,
        });
      }
      entries.sort((a, b) => b.stat - a.stat);
    }

    const ferns = '<:Ferns:1395219665638391818>';
    const userEntry = entries.find(entry => entry.safeKey === displayKey);
    const userRank = userEntry ? entries.findIndex(entry => entry.safeKey === displayKey) + 1 : 'Unranked';

    const itemsPerPage = 10;
    const totalPages = Math.ceil(entries.length / itemsPerPage);
    let currentPage = 0;

    // ⬇️ UPDATED SECTION: added user ID display in leaderboard lines
    const generateLeaderboardEmbed = (page) => {
      const start = page * itemsPerPage;
      const leaderboard = entries.slice(start, start + itemsPerPage)
        .map((entry, index) => {
          const base = `**__${start + index + 1}.__  ${entry.username}**`;
          if (type === 'wallet' || type === 'bank' || type === 'money') {
            return `${base}\n✦  ${ferns}・${entry.stat.toLocaleString()}`;
          } else {
            return `${base}\n✦  🎉・Level ${entry.stat.toLocaleString()}・\`${entry.xp.toLocaleString()} XP\``;
          }
        }).join('\n\n');

      let leaderboardType;
      if (type === 'wallet') leaderboardType = 'Wallet';
      else if (type === 'bank') leaderboardType = 'Bank';
      else if (type === 'money') leaderboardType = 'Money';
      else leaderboardType = 'Level';

      return new EmbedBuilder()
        .setTitle(`**╭─── 🌿 ${leaderboardType} Leaderboard 🌿 ───╮**`)
        .setDescription(
          (leaderboard || "      No users found.") +
              `\n\n**╰─────────[ Your Rank: #${userRank} ]──────────╯**`
        )
        .setColor('#de4949')
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({ text: `Page ${page + 1} of ${totalPages}`, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
    };

    const row = () => new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
        new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1)
      );

    await interaction.reply({ embeds: [generateLeaderboardEmbed(currentPage)], components: [row()] });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({ content: "You're not allowed to use these buttons.", flags: 64 });
      }

      if (buttonInteraction.customId === 'previous' && currentPage > 0) {
        currentPage--;
      } else if (buttonInteraction.customId === 'next' && currentPage < totalPages - 1) {
        currentPage++;
      } else if (buttonInteraction.customId === 'stop') {
        await buttonInteraction.update({ components: [] });
        collector.stop();
        return;
      }

      await buttonInteraction.update({ embeds: [generateLeaderboardEmbed(currentPage)], components: [row()] });
    });

    collector.on('end', () => {
      if (message.editable) {
        message.edit({ components: [] });
      }
    });
  },
};
