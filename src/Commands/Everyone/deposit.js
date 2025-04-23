// deposit.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
        const walletFolder = path.resolve(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Economy/Balance`);
        const bankFolder = path.resolve(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Economy/Bank`);
        const walletFilePath = path.join(walletFolder, `${user.username}.txt`);
        const bankFilePath = path.join(bankFolder, `${user.username}.txt`);
        
        // Get the deposit amount from the command options
        let depositAmount = interaction.options.getInteger('amount');

        // Ensure folders exist
        if (!fs.existsSync(walletFolder)) {
            fs.mkdirSync(walletFolder, { recursive: true });
        }
        if (!fs.existsSync(bankFolder)) {
            fs.mkdirSync(bankFolder, { recursive: true });
        }

        // Read the user's Wallet balance
        let walletBalance = 0;
        try {
            if (fs.existsSync(walletFilePath)) {
                walletBalance = parseInt(fs.readFileSync(walletFilePath, 'utf8'), 10);
            }
        } catch (error) {
            console.error('Error reading wallet balance:', error);
        }

        // If depositAmount is 0, deposit all wallet points
        if (depositAmount === 0) {
            depositAmount = walletBalance;
        }

        // Check if the user has enough balance in the Wallet or if the deposit amount is valid
        if (walletBalance < depositAmount || depositAmount <= 0) {
            return interaction.reply('You do not have enough points to deposit or you entered an invalid amount.');
        }

        // Read the user's Bank balance
        let bankBalance = 0;
        try {
            if (fs.existsSync(bankFilePath)) {
                bankBalance = parseInt(fs.readFileSync(bankFilePath, 'utf8'), 10);
            }
        } catch (error) {
            console.error('Error reading bank balance:', error);
        }

        // Deduct the deposit amount from the Wallet and add to the Bank
        walletBalance -= depositAmount;
        bankBalance += depositAmount;

        // Save the updated balances
        fs.writeFileSync(walletFilePath, walletBalance.toString());
        fs.writeFileSync(bankFilePath, bankBalance.toString());

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF) // White color
            .setTitle(`**${user.username}'s Deposit**`)
            .setDescription(`Successfully deposited **${depositAmount} Coins🪙** from your Wallet to your Bank.`)
            .addFields(
                { name: '**🪙Wallet Balance**', value: `${walletBalance} Coins`, inline: true },
                { name: '**🏦Bank Balance**', value: `${bankBalance} Coins`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Your Savings are Growing!' })

        // Respond with the embed
        await interaction.reply({ embeds: [embed] });

        // Console Logs
        console.log(`[${timestamp}] ${guild.name} ${guild.id} ${user.username} used the deposit command. Deposit Amount: ${depositAmount} Coins 🪙`);
    },
};
