const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, MessageFlags } = require('discord.js');
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
                  flags: MessageFlags.Ephemeral
            });
        }

    if (!guild) {
      return interaction.reply({
        content: 'This command must be used in a server.',
        flags: MessageFlags.Ephemeral
      });
    }

    const guildKey = `${guild.name}_${guild.id}`;
    const userKey = `${user.username.replace(/\./g, '_')}_${user.id}`;

    // console logs
    console.log(`[🌿] [USE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the use command.`);

    // Load inventory
    let fullInventory = {};
    try {
      const inv = await db.inventory.get(guildKey);
      fullInventory = typeof inv === 'object' && inv !== null ? inv : {};
    } catch {
      fullInventory = {};
    }

    const userData = fullInventory[userKey];
    if (!userData || !Array.isArray(userData.inventory) || userData.inventory.length === 0) {
      return interaction.reply({
        content: 'Your inventory is empty.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Build select menu
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

    // Initial reply with select menu
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

    collector.on('collect', async select => {
      const index = parseInt(select.values[0]);
      const selectedItem = userData.inventory[index];

      // Check for roleId
      if (!selectedItem.roleId) {
        return select.update({
          content: 'This item does not grant a role.',
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      const role = guild.roles.cache.get(selectedItem.roleId);
      if (!role) {
        return select.update({
          content: `The role with ID \`${selectedItem.roleId}\` does not exist.`,
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      // Check if user already has the role
      if (member.roles.cache.has(role.id)) {
        return select.update({
          content: `You already have the **${role.name}** role!`,
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      // Grant the role
      try {
        await member.roles.add(role);
      } catch (err) {
        console.error('Failed to add role:', err);
        return select.update({
          content: 'Failed to assign the role. Do I have permission?',
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      // Remove item from inventory
      userData.inventory.splice(index, 1);

      // Save updated inventory
      try {
        await db.inventory.set(guildKey, {
          ...fullInventory,
          [userKey]: userData
        });
      } catch (err) {
        console.error('Failed to update inventory:', err);
        return select.update({
          content: 'Role was given, but failed to update your inventory.',
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }

      return select.update({
        content: `You used **${selectedItem.title}** and received the **${role.name}** role.`,
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
  }
};
