const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
  name: 'refund',

  async execute(message) {
    // Block DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const user = message.author;
    const guild = message.guild;
    const guildKey = `${guild.id}`;

    // OLD → NEW keys
    const safeUsername = user.username.replace(/\./g, '_');
    const oldKey = `${safeUsername}_${user.id}`;
    const newKey = `${user.id}`;

    console.log(
      `[🌿] [REFUND] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${guild.name} ${guild.id} ${user.username} used the refund command.`
    );

    // -------------------------------------------------------
    // 🔥 DATABASE MIGRATION LOGIC (UNCHANGED)
    // -------------------------------------------------------
    async function migrateData() {
      // ---------- INVENTORY ----------
      let fullInventory = await db.inventory.get(guildKey).catch(() => undefined);

      if (fullInventory && typeof fullInventory === 'object') {
        if (fullInventory[oldKey] && !fullInventory[newKey]) {
          fullInventory[newKey] = fullInventory[oldKey];
          delete fullInventory[oldKey];
          await db.inventory.set(guildKey, fullInventory);

          console.log(`[MIGRATION] Inventory migrated ${oldKey} → ${newKey}`);
        }
      }

      // ---------- WALLET ----------
      const oldWallet = await db.wallet.get(oldKey).catch(() => undefined);
      const newWallet = await db.wallet.get(newKey).catch(() => undefined);

      if (oldWallet && !newWallet) {
        await db.wallet.set(newKey, oldWallet);
        await db.wallet.delete(oldKey);
        console.log(`[MIGRATION] Wallet migrated ${oldKey} → ${newKey}`);
      }

      // ---------- BANK ----------
      const oldBank = await db.bank.get(oldKey).catch(() => undefined);
      const newBank = await db.bank.get(newKey).catch(() => undefined);

      if (oldBank && !newBank) {
        await db.bank.set(newKey, oldBank);
        await db.bank.delete(oldKey);
        console.log(`[MIGRATION] Bank migrated ${oldKey} → ${newKey}`);
      }
    }

    await migrateData();
    // -------------------------------------------------------

    // Always use ID-based key
    const userKey = newKey;

    // Load inventory
    let fullInventory = await db.inventory.get(guildKey).catch(() => ({})) || {};
    const userInventoryData = fullInventory[userKey] || { inventory: [] };
    let inventory = userInventoryData.inventory || [];

    if (inventory.length === 0) {
      return message.reply('You have no items in your inventory to refund.');
    }

    const custom = await db.settings.get(`${guild.id}.currencyicon`)
    const ferns = await db.default.get("Default.ferns");

    const customname = await db.settings.get(`${guild.id}.currencyname`)
    const fernsname = await db.default.get("Default.name");

    // --------------------------
    // Build select menu options
    // --------------------------
    const options = inventory.map((item, index) => ({
      label: `〉${item.title.slice(0, 75)}`  +  ` - ` + `${custom || `🌿`}` + `${item.price.toLocaleString()}`,
      description: item.description?.slice(0, 100) || 'No description.',
      value: String(index)
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('refund_select')
      .setPlaceholder('Select an item to refund')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await message.reply({
      content: 'Choose the item you want to refund:',
      components: [row]
    });

    // --------------------------
    // Collector
    // --------------------------
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 15000,
      max: 1,
      filter: i => i.user.id === user.id
    });

    collector.on('collect', async selectInteraction => {
      const selectedIndex = parseInt(selectInteraction.values[0], 10);
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
      fullInventory[userKey].inventory = inventory;
      await db.inventory.set(guildKey, fullInventory);

      // Add money back to wallet
      const balanceData =
        (await db.wallet.get(userKey).catch(() => ({ balance: 0 }))) || { balance: 0 };

      balanceData.balance += refundAmount;
      await db.wallet.set(userKey, balanceData);

      return selectInteraction.update({
        content: `You refunded **${selectedItem.title}** for **${custom || ferns} ${refundAmount.toLocaleString()}!**`,
        components: []
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        reply.edit({
          content: 'You didn’t select an item in time.',
          components: []
        }).catch(() => {});
      }
    });
  }
};
