// deposit.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const db = require("../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Deposit points from your Wallet to your Bank.')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('The amount of points to deposit.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const timestamp = new Date().toLocaleTimeString();
        const { guild } = interaction;
        const { user } = interaction;
        
        // Get the deposit amount from the command options
        let depositAmount = interaction.options.getInteger('amount');

        // Get values from database
        let balance = await db.balance.get(user.username + "_" + user.id + ".balance") || 0;
        let bank    = await db.bank.get(user.username + "_" + user.id + ".bank") || 0;

        // If depositAmount is 0, deposit all wallet points
        if (depositAmount === 0) {
            depositAmount = balance;
        }

        // Check if the user has enough balance in the Wallet or if the deposit amount is valid
        if (balance < depositAmount || depositAmount <= 0) {
            return interaction.reply('You do not have enough points to deposit or you entered an invalid amount.');
        }

        // Deduct the deposit amount from the Wallet and add to the Bank
        balance -= depositAmount;
        bank += depositAmount;

        await db.balance.set(user.username + "_" + user.id + ".balance", balance);
        await db.bank.set(user.username + "_" + user.id + ".bank", bank);

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF) // White color
            .setTitle(`**${user.username}'s Deposit**`)
            .setDescription(`Successfully deposited **${depositAmount} Coins🪙** from your Wallet to your Bank.`)
            .addFields(
                { name: '**🪙Wallet Balance**', value: `${balance} Coins`, inline: true },
                { name: '**🏦Bank Balance**', value: `${bank} Coins`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Your Savings are Growing!' })

        // Respond with the embed
        await interaction.reply({ embeds: [embed] });

        // Console Logs
        console.log(`[${timestamp}] ${guild.name} ${guild.id} ${user.username} used the deposit command. Deposit Amount: ${depositAmount} Coins 🪙`);
    },
};
