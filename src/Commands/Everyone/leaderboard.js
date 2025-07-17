const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription("Displays The Leaderboard")
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Which leaderboard would you like to see?')
        .setRequired(true)
        .addChoices(
          { name: 'Balance', value: 'balance' },
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

    console.log(`[${new Date().toLocaleTimeString()}] ${interaction.guild.name} ${interaction.guild.id} ${interaction.user.username} used the leaderboard command for '${type}'.`);

    let entries = [];

    if (type === 'balance') {
      const allKeys = await db.balance.keys();
      entries = (await Promise.all(
        allKeys
          .filter(key => key.endsWith('.balance'))
          .map(async key => {
            const rawKey = key.slice(0, -('.balance'.length));
            const lastUnderscoreIndex = rawKey.lastIndexOf('_');
            const safeUsername = rawKey.slice(0, lastUnderscoreIndex);
            const userId = rawKey.slice(lastUnderscoreIndex + 1);
            const balance = await db.balance.get(key) || 0;
            return {
              userId,
              username: safeUsername.replace(/_/g, '.'),
              safeKey: `${safeUsername}_${userId}`,
              stat: balance,
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
      }).sort((a, b) => b.stat - a.stat);
    }
    const ferns = '<:Ferns:1395219665638391818>';
    const userEntry = entries.find(entry => entry.safeKey === displayKey);
    const userRank = userEntry ? entries.findIndex(entry => entry.safeKey === displayKey) + 1 : 'Unranked';

    const itemsPerPage = 10;
    const totalPages = Math.ceil(entries.length / itemsPerPage);
    let currentPage = 0;

    const generateLeaderboardEmbed = (page) => {
      const start = page * itemsPerPage;
      const leaderboard = entries.slice(start, start + itemsPerPage)
        .map((entry, index) => {
          const base = `**    \n__${start + index + 1}.__  ${entry.username}`;
          return type === 'balance'
            ? `${base} \n♢  ${ferns}${entry.stat}**`
            : `${base} \n♢  ⬆️Level ${entry.stat} (${entry.xp} XP)**`;
        })
        .join('\n');

      return new EmbedBuilder()
        .setTitle(`**╭─── ${type === 'balance' ? 'Balance' : 'Level'} Leaderboard ───╮**`)
        .setDescription((leaderboard || "No users found.") + `\n\n**╰─────[ Your Rank: #${userRank} ]─────╯**`)
        .setColor(0xFFFFFF)
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
