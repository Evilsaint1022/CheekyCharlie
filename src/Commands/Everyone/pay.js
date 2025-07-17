const { SlashCommandBuilder } = require('discord.js');

// Replace with the actual path to your DotDatabase instance
const db = require("../../Handlers/database");

// Replace /\./g with _ when saving
function escapeUsername(username) {
  return username.replace(/\./g, '_');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfer points to another member.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to whom you want to transfer points.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('The number of points to transfer.')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }
    const ferns = '<:Ferns:1395219665638391818>';
    const sender = interaction.user;
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (sender.id === user.id) {
      return interaction.reply({ content: 'You cannot pay yourself!', flags: 64 });
    }

    if (user.bot) {
      return interaction.reply({ content: `You cannot transfer ${ferns}'s to bots!`, flags: 64 });
    }

    if (amount <= 0) {
      return interaction.reply({ content: 'The transfer amount must be greater than 0.', flags: 64 });
    }

    try {
      const senderKey = `${escapeUsername(sender.username)}_${sender.id}`;
      const userKey = `${escapeUsername(user.username)}_${user.id}`;

      const senderData = await db.balance.get(senderKey) ?? { balance: 0 };
      const userData = await db.balance.get(userKey) ?? { balance: 0 };

      const senderBalance = senderData.balance || 0;
      const userBalance = userData.balance || 0;

      if (senderBalance < amount) {
        return interaction.reply({ content: `You do not have enough points to transfer ${amount.toLocaleString()}${ferns}.`, flags: 64 });
      }

      await db.balance.set(senderKey, { balance: senderBalance - amount });
      await db.balance.set(userKey, { balance: userBalance + amount });

      await interaction.reply(`✅ **Payment Successful!**\n**${sender.username}** paid **${amount.toLocaleString()}${ferns}** to **${user.username}**.`);

      console.log(`[${new Date().toLocaleTimeString()}] ${interaction.guild.name} ${interaction.guild.id} ${sender.username} paid ${amount.toLocaleString()} Ferns to ${user.username}`);
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: 'An error occurred while processing the transaction. Please try again later.',
        flags: 64,
      });
    }
  },
};
