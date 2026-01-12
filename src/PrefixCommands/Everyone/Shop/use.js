const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
  name: 'use',

  async execute(message) {
    // -------------------------
    // BASIC CHECKS
    // -------------------------
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guild = message.guild;
    const member = message.member;
    const user = message.author;

    const guildKey = `${guild.id}`;
    const userIdKey = user.id; // ✅ clean ID-only key

    console.log(
      `[🌿] [USE] [${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${guild.name} ${guild.id} ${user.username} used the use command.`
    );

    // -------------------------
    // LOAD INVENTORY + MIGRATE
    // -------------------------
    let fullInventory = {};
    try {
      const inv = await db.inventory.get(guildKey);
      fullInventory = typeof inv === 'object' && inv !== null ? inv : {};
    } catch {
      fullInventory = {};
    }

    const oldKey = `${user.username.replace(/\./g, '_')}_${user.id}`;
    let userData = null;

    // CASE 1: new key exists
    if (fullInventory[userIdKey]) {
      userData = fullInventory[userIdKey];

      // Merge old key if present
      if (fullInventory[oldKey]) {
        if (Array.isArray(fullInventory[oldKey].inventory)) {
          userData.inventory = [
            ...(userData.inventory || []),
            ...fullInventory[oldKey].inventory
          ];
        }

        delete fullInventory[oldKey];
        await db.inventory.set(guildKey, fullInventory);
      }
    }
    // CASE 2: only old key exists
    else if (fullInventory[oldKey]) {
      userData = fullInventory[oldKey];
      delete fullInventory[oldKey];

      fullInventory[userIdKey] = userData;
      await db.inventory.set(guildKey, fullInventory);
    }
    // CASE 3: no inventory at all
    else {
      userData = { inventory: [] };
      fullInventory[userIdKey] = userData;
      await db.inventory.set(guildKey, fullInventory);
    }

    // -------------------------
    // EMPTY INVENTORY CHECK
    // -------------------------
    if (!Array.isArray(userData.inventory) || userData.inventory.length === 0) {
      return message.reply('Your inventory is empty.');
    }

    // -------------------------
    // BUILD SELECT MENU
    // -------------------------
    const menu = new StringSelectMenuBuilder()
      .setCustomId('use_item_menu')
      .setPlaceholder('Select an item to use')
      .addOptions(
        userData.inventory.map((item, index) => ({
          label: item.title.slice(0, 100),
          description: item.description?.slice(0, 100) || 'No description',
          value: index.toString()
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const reply = await message.reply({
      content: 'Choose an item to use:',
      components: [row]
    });

    // -------------------------
    // COLLECTOR
    // -------------------------
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 15000,
      max: 1,
      filter: i => i.user.id === user.id
    });

    // -------------------------
    // ITEM SELECTED
    // -------------------------
    collector.on('collect', async select => {
      const index = parseInt(select.values[0], 10);
      const selectedItem = userData.inventory[index];

      if (!selectedItem?.roleId) {
        return select.update({
          content: 'This item does not grant a role.',
          components: []
        });
      }

      const role = guild.roles.cache.get(selectedItem.roleId);
      if (!role) {
        return select.update({
          content: `The role with ID \`${selectedItem.roleId}\` does not exist.`,
          components: []
        });
      }

      if (member.roles.cache.has(role.id)) {
        return select.update({
          content: `You already have the **${role.name}** role!`,
          components: []
        });
      }

      try {
        await member.roles.add(role);
      } catch (err) {
        console.error('Failed to add role:', err);
        return select.update({
          content: 'Failed to assign the role. Do I have permission?',
          components: []
        });
      }

      // Remove item from inventory
      userData.inventory.splice(index, 1);
      fullInventory[userIdKey] = userData;
      await db.inventory.set(guildKey, fullInventory);

      return select.update({
        content: `You used **${selectedItem.title}** and received the **${role.name}** role.`,
        components: []
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        reply.edit({
          content: 'No selection made. Command expired.',
          components: []
        }).catch(() => {});
      }
    });
  }
};
