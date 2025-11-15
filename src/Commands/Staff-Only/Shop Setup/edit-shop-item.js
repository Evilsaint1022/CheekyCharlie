const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-shop-item')
    .setDescription('Edit a shop item by its current title.')
    .addStringOption(opt =>
      opt.setName('current_title')
        .setDescription('The current title of the item to edit')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('new_title')
        .setDescription('The new title (optional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('New description (optional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('roleid')
        .setDescription('New role ID (optional)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('price')
        .setDescription('New price (optional)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('stock')
        .setDescription('New stock (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {

    if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

        const user = interaction.user;
        const guild = interaction.guild;
        
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

    const guildKey = `${interaction.guild.name}_${interaction.guild.id}`;
    let shopItems = [];

    try {
      const items = await db.shop.get(guildKey);
      shopItems = Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('DB Load Error:', err);
      return interaction.reply({ content: 'Failed to load shop items.', flags: MessageFlags.Ephemeral });
    }

    if (shopItems.length === 0) {
      return interaction.reply({ content: 'Shop is empty for this server.', flags: MessageFlags.Ephemeral });
    }

    const currentTitle = interaction.options.getString('current_title').trim();
    const index = shopItems.findIndex(
      item => item.title.toLowerCase() === currentTitle.toLowerCase()
    );

    if (index === -1) {
      return interaction.reply({ content: `No item found with title "${currentTitle}".`, flags: MessageFlags.Ephemeral });
    }

    // Get optional update values
    const newTitle = interaction.options.getString('new_title');
    const newDesc = interaction.options.getString('description');
    const newRoleId = interaction.options.getString('roleid');
    const newPrice = interaction.options.getInteger('price');
    const newStock = interaction.options.getInteger('stock');

    // Update only fields provided
    if (newTitle) shopItems[index].title = newTitle;
    if (newDesc) shopItems[index].description = newDesc;
    if (newRoleId) shopItems[index].roleId = newRoleId;
    if (typeof newPrice === 'number') shopItems[index].price = newPrice;
    if (typeof newStock === 'number') shopItems[index].stock = newStock;

    try {
      await db.shop.set(guildKey, shopItems);
    } catch (err) {
      console.error('DB Save Error:', err);
      return interaction.reply({ content: 'Failed to save updated shop item.', flags: MessageFlags.Ephemeral });
    }

    //console logs
    console.log(`[⭐] [EDIT-SHOP-ITEM] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the edit-shop-item command.`);

    return interaction.reply({
      content: `Successfully updated the item "${currentTitle}".`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
