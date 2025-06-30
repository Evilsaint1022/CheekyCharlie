const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription("Displays a user's inventory.")
    .addUserOption(option =>
      option.setName('user')
        .setDescription("Select a user to view their inventory.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

    const guildKey = `${guild.name}_${guild.id}`;
    const userKey = `${user.username.replace(/\./g, '_')}_${user.id}`;

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
        content: `${user.id === interaction.user.id ? 'Your' : `${user.username}'s`} inventory is empty.`,
      });
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Inventory`)
      .setColor('#ffffff')
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    const inventoryText = userData.inventory.map((item, index) => {
      return `**${index + 1}.** **__${item.title}__** - ${item.description}`;
    }).join('\n\n');

    embed.setDescription(inventoryText);

    return interaction.reply({ embeds: [embed] });
  }
};
