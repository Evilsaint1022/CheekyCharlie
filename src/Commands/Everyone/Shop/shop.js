const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the items available in the shop.'),

  async execute(interaction) {
    const guild = interaction.guild;

    if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }
        
    const guildkey = `${interaction.guild.name}_${interaction.guild.id}`;
    let shopItems = [];

    try {
      const items = await db.shop.get(guildkey);
      shopItems = Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('Failed to get shop data:', error);
      return interaction.reply({
        content: 'Failed to load shop items. Please try again later.',
        flags: 64,
      });
    }

    if (shopItems.length === 0) {
      return interaction.reply({ content: 'The shop is currently empty!', flags: 64 });
    }

    shopItems.sort((a, b) => a.price - b.price);

    const itemsPerPage = 5;
    const totalPages = Math.ceil(shopItems.length / itemsPerPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const items = shopItems.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle(`**╭─── 🌿The ${interaction.guild.name} Shop ───╮**`)
        .setDescription('*You can buy things using the **`/buy`** command.*\n· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·')
        .setColor('#ffffff')
        .setFooter({ text: `Page ${page + 1} of ${totalPages}`, iconURL: interaction.client.user.displayAvatarURL() })
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

      items.forEach((item, index) => {
        const globalIndex = start + index + 1;
        const displayStock = item.stock === -1 || item.stock === undefined ? '∞' : item.stock.toLocaleString();

        embed.addFields({
          name: `${globalIndex} 🌿**__${item.title}__**`,
          value: `${item.description}\n> • **Role Reward:** <@&${item.roleId}>\n> • **Price:** <:Ferns:1395219665638391818> ${item.price.toLocaleString()}\n> • **Stock:** ${displayStock}`
        });
      });

      embed.addFields(
        { name: '\n', value: `*🌿Thanks for using The ${interaction.guild.name} Shop!*` },
        { name: '\n', value: '**╰────────────────────────────╯**' }
      );
      console.log(`[SHOP] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${interaction.user.username} used the shop command.`);
      return embed;
    };

    const generateButtons = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
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
    };

    await interaction.reply({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons()],
    });

    const embedMessage = await interaction.fetchReply();

    const collector = embedMessage.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({ content: 'You cannot interact with this menu.', flags: 64 });
      }

      if (buttonInteraction.customId === 'prev') currentPage--;
      if (buttonInteraction.customId === 'next') currentPage++;
      if (buttonInteraction.customId === 'stop') {
        collector.stop();
        return buttonInteraction.update({ components: [] });
      }

      await buttonInteraction.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons()],
      });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] });
    });
  },
};
