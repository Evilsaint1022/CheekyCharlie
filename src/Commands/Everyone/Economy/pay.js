const { SlashCommandBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

// Replace /\./g with _ when saving (legacy)
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
      // ------------------------------------------------------
      // 🔄 1️⃣ MIGRATION — Convert old username_ID → ID-only
      // ------------------------------------------------------

      const senderOldKey = `${escapeUsername(sender.username)}_${sender.id}`;
      const userOldKey = `${escapeUsername(user.username)}_${user.id}`;

      const senderNewKey = `${sender.id}`;
      const userNewKey = `${user.id}`;

      // Load old objects
      const oldSenderObj = await db.wallet.get(senderOldKey);
      const oldUserObj = await db.wallet.get(userOldKey);

      // If sender has old key → move it
      if (oldSenderObj !== undefined) {
        await db.wallet.set(senderNewKey, oldSenderObj);
        await db.wallet.delete(senderOldKey);
      }

      // If recipient has old key → move it
      if (oldUserObj !== undefined) {
        await db.wallet.set(userNewKey, oldUserObj);
        await db.wallet.delete(userOldKey);
      }

      // ------------------------------------------------------
      // 2️⃣ Load balances using NEW ID-only keys
      // ------------------------------------------------------

      const senderData = await db.wallet.get(senderNewKey) ?? { balance: 0 };
      const userData = await db.wallet.get(userNewKey) ?? { balance: 0 };

      const senderBalance = senderData.balance || 0;
      const userBalance = userData.balance || 0;

      if (senderBalance < amount) {
        return interaction.reply({
          content: `You do not have enough points to transfer ${amount.toLocaleString()}${ferns}.`,
          flags: 64
        });
      }

      // ------------------------------------------------------
      // 3️⃣ Apply transaction
      // ------------------------------------------------------

      await db.wallet.set(senderNewKey, { balance: senderBalance - amount });
      await db.wallet.set(userNewKey, { balance: userBalance + amount });

      await interaction.reply(
        `✅ **Payment Successful!**\n**${sender.username}** paid **${ferns}${amount.toLocaleString()}** to **${user.username}**.`
      );

      // ------------------------------------------------------
      // Logging
      // ------------------------------------------------------
      console.log(
        `[🌿] [PAY] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
        `${interaction.guild.name} ${interaction.guild.id} ${sender.username} paid ` +
        `${amount.toLocaleString()} Ferns to ${user.username}`
      );

    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: 'An error occurred while processing the transaction. Please try again later.',
        flags: 64,
      });
    }
  },
};


// console.log(`[🌿] [PAY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${interaction.guild.name} ${interaction.guild.id} ${sender.username} paid ${amount.toLocaleString()} Ferns to ${user.username}`);