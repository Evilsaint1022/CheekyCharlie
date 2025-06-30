const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType
} = require('discord.js');
const db = require('../../Handlers/database'); // Adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refund')
    .setDescription('Refund an item from your inventory and get your money back.'),

  async execute(interaction) {
    const user = interaction.user;
    const guild = interaction.guild;

    if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

    const safeUsername = user.username.replace(/\./g, '_');
    const userKey = `${safeUsername}_${user.id}`;
    const guildKey = `${guild.name}_${guild.id}`;

    // Get inventory
    const userInventoryData = await db.inventory.get(`${guildKey}.${userKey}`) || {};
    let inventory = userInventoryData.inventory || [];

    if (inventory.length === 0) {
      return interaction.reply({
        content: 'You have no items in your inventory to refund.',
        flags: 64
      });
    }

    // Create selection menu
    const options = inventory.map((item, index) => ({
      label: item.title.length > 25 ? item.title.slice(0, 22) + '...' : item.title,
      description: item.description?.slice(0, 50) || 'No description.',
      value: String(index)
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('refund_select')
      .setPlaceholder('Select an item to refund')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: 'Choose the item you want to refund:',
      components: [row],
    });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 15000,
      max: 1,
      filter: i => i.user.id === user.id
    });

    collector.on('collect', async selectInteraction => {
      const selectedIndex = parseInt(selectInteraction.values[0]);
      const selectedItem = inventory[selectedIndex];

      if (!selectedItem) {
        return selectInteraction.update({
          content: 'Selected item not found.',
          components: []
        });
      }

      const refundAmount = selectedItem.price || 0;

      // Remove item from inventory
      inventory.splice(selectedIndex, 1);
      await db.inventory.set(`${guildKey}.${userKey}.inventory`, inventory);

      // Update balance
      const balanceData = await db.balance.get(userKey) || { balance: 0 };
      balanceData.balance += refundAmount;
      await db.balance.set(userKey, balanceData);

      return selectInteraction.update({
        content: `You refunded **${selectedItem.title}** for **${refundAmount}** 🪙's!`,
        components: []
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({
          content: 'You didn’t select an item in time.',
          components: []
        }).catch(() => {});
      }
    });
  }
};
