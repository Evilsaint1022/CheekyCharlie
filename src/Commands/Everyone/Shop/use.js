const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an item from your inventory.'),

  async execute(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;
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

    const guildKey = `${guild.name}_${guild.id}`;
    const userIdKey = user.id; // ✅ NEW clean ID-only key
    console.log(`[🌿] [USE] [${new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the use command.`);

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

    // Check for old key
    const oldKey = `${user.username.replace(/\./g, '_')}_${user.id}`;
    let userData = null;

    // CASE 1: migrated key already exists
    if (fullInventory[userIdKey]) {
      userData = fullInventory[userIdKey];

      // If old key ALSO exists, merge it then delete
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
    // CASE 2: old key exists, migrate it
    else if (fullInventory[oldKey]) {
      userData = fullInventory[oldKey];
      delete fullInventory[oldKey];

      fullInventory[userIdKey] = userData;

      await db.inventory.set(guildKey, fullInventory);
    }
    // CASE 3: no inventory exists
    else {
      userData = { inventory: [] };
      fullInventory[userIdKey] = userData;
      await db.inventory.set(guildKey, fullInventory);
    }

    // -------------------------
    // EMPTY INVENTORY CHECK
    // -------------------------
    if (!Array.isArray(userData.inventory) || userData.inventory.length === 0) {
      return interaction.reply({
        content: 'Your inventory is empty.',
        flags: 64
      });
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

    await interaction.reply({
      content: 'Choose an item to use:',
      components: [row],
    });

    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 15000,
      max: 1,
      filter: i => i.user.id === user.id
    });

    // -------------------------
    // ITEM SELECTED
    // -------------------------
    collector.on('collect', async select => {
      const index = parseInt(select.values[0]);
      const selectedItem = userData.inventory[index];

      if (!selectedItem.roleId) {
        return select.update({
          content: 'This item does not grant a role.',
          components: [],
          flags: 64
        });
      }

      const role = guild.roles.cache.get(selectedItem.roleId);
      if (!role) {
        return select.update({
          content: `The role with ID \`${selectedItem.roleId}\` does not exist.`,
          components: [],
          flags: 64
        });
      }

      if (member.roles.cache.has(role.id)) {
        return select.update({
          content: `You already have the **${role.name}** role!`,
          components: [],
          flags: 64
        });
      }

      try {
        await member.roles.add(role);
      } catch (err) {
        console.error('Failed to add role:', err);
        return select.update({
          content: 'Failed to assign the role. Do I have permission?',
          components: [],
          flags: 64
        });
      }

      // Remove inventory item
      userData.inventory.splice(index, 1);

      fullInventory[userIdKey] = userData;
      await db.inventory.set(guildKey, fullInventory);

      return select.update({
        content: `You used **${selectedItem.title}** and received the **${role.name}** role.`,
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
  }
};
