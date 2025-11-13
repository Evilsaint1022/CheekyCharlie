const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType, MessageFlags
} = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop.'),

  async execute(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;

    if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

    if (!guild) {
      return interaction.reply({
        content: 'This command must be used in a server.',
        flags: MessageFlags.Ephemeral
      });
    }
    const ferns = '<:Ferns:1395219665638391818>';
    const safeUsername = user.username.replace(/\./g, '_');
    const dbKeyPrefix = `${safeUsername}_${user.id}`;
    const guildKey = `${guild.name}_${guild.id}`;

    // Load shop items
    let shopItems = [];
    try {
      const items = await db.shop.get(guildKey);
      shopItems = Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('Error loading shop:', err);
      return interaction.reply({ content: 'Failed to load shop items.', flags: MessageFlags.Ephemeral });
    }

    if (shopItems.length === 0) {
      return interaction.reply({ content: 'The shop is currently empty.', flags: MessageFlags.Ephemeral });
    }

    // Create selection menu
    const menu = new StringSelectMenuBuilder()
      .setCustomId('buy_menu')
      .setPlaceholder('Select an item to buy')
      .addOptions(
        shopItems.map((item, index) => ({
        label: `${item.title.slice(0, 75)} - 🌿${item.price.toLocaleString()}`,
        description: item.description.slice(0, 100),
        value: index.toString()
      }))
    );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: 'Select an item from the shop to buy:',
      components: [row],
    });

    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === user.id,
      time: 15000,
      max: 1
    });

    collector.on('collect', async select => {
      const index = parseInt(select.values[0]);
      const selectedItem = shopItems[index];

      // Check user balance
      let balance = 0;
      try {
        const bal = await db.wallet.get(dbKeyPrefix);
        balance = typeof bal === 'object' && bal !== null && 'balance' in bal
          ? parseInt(bal.balance) || 0
          : parseInt(bal) || 0;
      } catch {
        balance = 0;
      }

      if (balance < selectedItem.price) {
        return select.update({
          content: `You need ${ferns}${selectedItem.price.toLocaleString()} to buy **${selectedItem.title}**.`,
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      // Load full inventory object for the guild
      let fullInventory = {};
      try {
        const inv = await db.inventory.get(guildKey);
        fullInventory = typeof inv === 'object' && inv !== null ? inv : {};
      } catch {
        fullInventory = {};
      }

      const userInventoryData = fullInventory[dbKeyPrefix] ?? { inventory: [] };
      const { inventory } = userInventoryData;

      // Check if user already owns the item
      if (inventory.some(item => item.title === selectedItem.title)) {
        return select.update({
          content: `You already have the item **${selectedItem.title}** in your inventory!`,
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      // Handle stock
      if (typeof selectedItem.stock === 'number') {
        if (selectedItem.stock === -1) {
          // unlimited stock
        } else if (selectedItem.stock > 0) {
          selectedItem.stock -= 1;
        } else {
          return select.update({
            content: 'That item is out of stock!',
            components: [],
            flags: MessageFlags.Ephemeral
          });
        }
      }

      // Add item to inventory (excluding stock field)
      const { stock, ...cleanItem } = selectedItem;
      inventory.push(cleanItem);

      const newBalance = balance - selectedItem.price;

      // Save changes
      try {
        await db.shop.set(guildKey, shopItems); // update stock
        await db.inventory.set(guildKey, {
          ...fullInventory,
          [dbKeyPrefix]: { inventory }
        });
        await db.wallet.set(dbKeyPrefix, { balance: newBalance });
      } catch (err) {
        console.error('Error saving data:', err);
        return select.update({
          content: 'Failed to complete your purchase.',
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      return select.update({
        content: `You bought **${selectedItem.title}** for ${ferns}${selectedItem.price.toLocaleString()}!`,
        components: [],
        flags: MessageFlags.Ephemeral
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({
          content: 'No selection made. Command expired.',
          components: [],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      }
    });
    console.log(`[🌿] [BUY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the buy command.`);
  }
};
