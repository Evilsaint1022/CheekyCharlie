const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-shop-item')
    .setDescription('Remove an item from the shop by its title.')
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Exact title of the shop item to remove')
        .setRequired(true)
    ),

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

    const guildkey = `${interaction.guild.name}_${interaction.guild.id}`;
    let shopItems = [];

    try {
      const items = await db.shop.get(guildkey);
      shopItems = Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('Error fetching shop items:', error);
      return interaction.reply({ content: 'Failed to load shop items.', flags: 64 });
    }

    if (shopItems.length === 0) {
      return interaction.reply({ content: 'The shop is empty for this server.', flags: 64 });
    }

    const titleToRemove = interaction.options.getString('title').trim();

    const index = shopItems.findIndex(
      item => item.title.toLowerCase() === titleToRemove.toLowerCase()
    );

    if (index === -1) {
      return interaction.reply({ content: `No shop item found with the title "${titleToRemove}".`, flags: 64 });
    }

    shopItems.splice(index, 1);

    try {
      await db.shop.set(guildkey, shopItems);
    } catch (error) {
      console.error('Error saving updated shop:', error);
      return interaction.reply({ content: 'Failed to save changes to the shop.', flags: 64 });
    }

    //console logs
    console.log(`[⭐] [REMOVE-SHOP-ITEM] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the remove-shop-item command.`);

    return interaction.reply({ content: `Removed "${titleToRemove}" from the shop.`, flags: 64 });
  },
};
