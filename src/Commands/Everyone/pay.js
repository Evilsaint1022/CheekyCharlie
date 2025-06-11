const { SlashCommandBuilder } = require('discord.js');

// Replace with the actual path to your DotDatabase instance
const db = require("../../Handlers/database");

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

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

    const sender = interaction.user;
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (sender.id === user.id) {
      return interaction.reply({ content: 'You cannot pay yourself!', flags: 64 });
    }

    if (user.bot) {
      return interaction.reply({ content: `You cannot transfer 🪙's to bots!`, flags: 64 });
    }

    if (amount <= 0) {
      return interaction.reply({ content: 'The transfer amount must be greater than 0.', flags: 64 });
    }

    try {
      const senderKey = `${sender.username}_${sender.id}`;
      const userKey = `${user.username}_${user.id}`;

      const senderData = await db.balance.get(senderKey) ?? { balance: 0 };
      const userData = await db.balance.get(userKey) ?? { balance: 0 };

      if (senderData.balance < amount) {
        return interaction.reply({ content: `You do not have enough points to transfer ${amount}🪙.`, flags: 64 });
      }

      // Update balances
      senderData.balance -= amount;
      userData.balance += amount;

      // Save updated balances
      await db.balance.set(senderKey, senderData);
      await db.balance.set(userKey, userData);

      await interaction.reply(`✅ **Payment Successful!**\n**${sender.username}** paid **${amount} 🪙** to **${user.username}**.`);

      // Console Log
      console.log(`[${new Date().toLocaleTimeString()}] ${interaction.guild.name} ${interaction.guild.id} ${sender.username} has paid ${amount} Coins to ${user.username}.`);

    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: 'An error occurred while processing the transaction. Please try again later.',
        flags: 64,
      });
    }
  },
};
