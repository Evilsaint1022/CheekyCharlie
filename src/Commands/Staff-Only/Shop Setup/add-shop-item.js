const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-shop-item')
    .setDescription('Add a new item to the shop.')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the item')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description of the item')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role granted when purchased')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('price')
        .setDescription('Price of the item')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('stock')
        .setDescription('Amount of this item available (leave empty for unlimited)')
        .setRequired(false)),

  async execute(interaction) {

    if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    try {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const role = interaction.options.getRole('role');
      const price = interaction.options.getInteger('price');
      const stock = interaction.options.getInteger('stock') ?? -1; // Default to -1 if not provided

      const guildKey = `${interaction.guild.name}_${interaction.guild.id}`;

      // Get current shop array or empty array
      let shopItems = await db.shop.get(guildKey) || [];

      // Check if item with same title exists (case insensitive)
      if (shopItems.some(item => item.title.toLowerCase() === title.toLowerCase())) {
        return interaction.reply({ content: `❌ An item with the title "${title}" already exists in the shop.`, flags: 64 });
      }

      // Add new item
      shopItems.push({
        title,
        description,
        roleId: role.id,
        price,
        stock
      });

      // Save back to db
      await db.shop.set(guildKey, shopItems);

      //console logs
      console.log(`[⭐] [ADD-SHOP-ITEM] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${interaction.guild.name} ${interaction.guild.id} ${interaction.user.username} used the add-shop-item command.`);
      
      //reply interaction
      return interaction.reply({
        content: `✅ Item "${title}" added to the shop with a stock of ${stock === -1 ? 'unlimited' : stock}.`,
        flags: 64
      });
    } catch (error) {
      console.error('Error adding shop item:', error);
      return interaction.reply({
        content: '❌ There was an error adding the item. Please try again later.',
        flags: 64
      });
    }
  }
};
