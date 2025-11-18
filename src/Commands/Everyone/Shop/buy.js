const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType
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
        flags: 64
      });
    }

    if (!guild) {
      return interaction.reply({
        content: 'This command must be used in a server.',
        flags: 64
      });
    }

    const ferns = '<:Ferns:1395219665638391818>';
    const safeUsername = user.username.replace(/\./g, '_');

    // 🔥 NEW: OLD (safeusername_userid) format
    const oldKey = `${safeUsername}_${user.id}`;

    // 🔥 NEW: NEW correct format (userid only)
    const newKey = `${user.id}`;

    const guildKey = `${guild.name}_${guild.id}`;

    // -------------------------------------------------------
    // 🔥 DATABASE MIGRATION LOGIC
    // -------------------------------------------------------
    async function migrateData() {
      // -------- WALLET --------
      const oldWallet = await db.wallet.get(oldKey).catch(() => undefined);
      const newWallet = await db.wallet.get(newKey).catch(() => undefined);

      if (oldWallet && !newWallet) {
        // Move old → new
        await db.wallet.set(newKey, oldWallet);
        await db.wallet.delete(oldKey);
        console.log(`[MIGRATION] Wallet migrated ${oldKey} → ${newKey}`);
      }

      // -------- BANK (optional, future proof) --------
      const oldBank = await db.bank.get(oldKey).catch(() => undefined);
      const newBank = await db.bank.get(newKey).catch(() => undefined);

      if (oldBank && !newBank) {
        await db.bank.set(newKey, oldBank);
        await db.bank.delete(oldKey);
        console.log(`[MIGRATION] Bank migrated ${oldKey} → ${newKey}`);
      }

      // -------- INVENTORY --------
      let inv = await db.inventory.get(guildKey).catch(() => undefined);
      if (inv && typeof inv === 'object') {
        if (inv[oldKey] && !inv[newKey]) {
          // Move inventory user → new id
          inv[newKey] = inv[oldKey];
          delete inv[oldKey];
          await db.inventory.set(guildKey, inv);
          console.log(`[MIGRATION] Inventory migrated ${oldKey} → ${newKey}`);
        }
      }
    }

    // Run migration before anything else
    await migrateData();
    // -------------------------------------------------------

    // From this point forward, ALWAYS use newKey
    const dbKey = newKey;

    // Load shop items
    let shopItems = [];
    try {
      const items = await db.shop.get(guildKey);
      shopItems = Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('Error loading shop:', err);
      return interaction.reply({ content: 'Failed to load shop items.', flags: 64 });
    }

    if (shopItems.length === 0) {
      return interaction.reply({ content: 'The shop is currently empty.', flags: 64 });
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

      // Load balance using *new* key
      let balance = 0;
      try {
        const bal = await db.wallet.get(dbKey);
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
          flags: 64
        });
      }

      // Load full inventory
      let fullInventory = {};
      try {
        const inv = await db.inventory.get(guildKey);
        fullInventory = typeof inv === 'object' && inv !== null ? inv : {};
      } catch {
        fullInventory = {};
      }

      const userInventoryData = fullInventory[dbKey] ?? { inventory: [] };
      const { inventory } = userInventoryData;

      // Check if user already owns item
      if (inventory.some(item => item.title === selectedItem.title)) {
        return select.update({
          content: `You already have the item **${selectedItem.title}** in your inventory!`,
          components: [],
          flags: 64
        });
      }

      // Handle stock
      if (typeof selectedItem.stock === 'number') {
        if (selectedItem.stock > 0) selectedItem.stock -= 1;
        else if (selectedItem.stock === 0) {
          return select.update({
            content: 'That item is out of stock!',
            components: [],
            flags: 64
          });
        }
      }

      // Add item (exclude stock)
      const { stock, ...cleanItem } = selectedItem;
      inventory.push(cleanItem);

      const newBalance = balance - selectedItem.price;

      // Save changes
      try {
        await db.shop.set(guildKey, shopItems);
        await db.inventory.set(guildKey, {
          ...fullInventory,
          [dbKey]: { inventory }
        });
        await db.wallet.set(dbKey, { balance: newBalance });
      } catch (err) {
        console.error('Error saving data:', err);
        return select.update({
          content: 'Failed to complete your purchase.',
          components: [],
          flags: 64
        });
      }

      return select.update({
        content: `You bought **${selectedItem.title}** for ${ferns}${selectedItem.price.toLocaleString()}!`,
        components: [],
        flags: 64
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({
          content: 'No selection made. Command expired.',
          components: [],
          flags: 64
        }).catch(() => {});
      }
    });

    console.log(`[🌿] [BUY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the buy command.`);
  }
};
