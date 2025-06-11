// withdraw.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require("../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw points from your Bank to your Wallet.')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('The amount of points to withdraw.')
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

        const { guild, user } = interaction;
        const timestamp = new Date().toLocaleTimeString();

        // Get the withdrawal amount from the command options
        let withdrawAmount = interaction.options.getInteger('amount');

        // Get values from database
        const bankBalance = await db.bank.get(`${user.username}_${user.id}.bank`) || 0;
        const walletBalance = await db.balance.get(`${user.username}_${user.id}.balance`) || 0;

        // If withdrawAmount is 0, withdraw all bank points
        if (withdrawAmount === 0) {
            withdrawAmount = bankBalance;
        }

        // Check if the user has enough balance in the Bank or if the withdrawal amount is valid
        if (bankBalance < withdrawAmount || withdrawAmount <= 0) {
            return interaction.reply('You do not have enough points in your Bank to withdraw or you entered an invalid amount.');
        }

        // Deduct the withdrawal amount from the Bank and add to the Wallet
        const updatedBankBalance = bankBalance - withdrawAmount;
        const updatedWalletBalance = walletBalance + withdrawAmount;

        await db.bank.set(`${user.username}_${user.id}.bank`, updatedBankBalance);
        await db.balance.set(`${user.username}_${user.id}.balance`, updatedWalletBalance);

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF) // White color
            .setTitle(`**${user.username}'s Withdrawal**`)
            .setDescription(`Successfully withdrew **${withdrawAmount} Coins🪙** from your Bank to your Wallet.`)
            .addFields(
                { name: '🪙 Wallet Balance', value: `${updatedWalletBalance} Coins`, inline: true },
                { name: '🏦 Bank Balance', value: `${updatedBankBalance} Coins`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Your Wallet is Growing!' })
            .setTimestamp();

        // Respond with the embed
        await interaction.reply({ embeds: [embed] });

        // Console Logs
        console.log(`[${timestamp}] ${guild.name} ${guild.id} ${user.username} used the withdraw command. Withdrawal Amount: ${withdrawAmount} Coins 🪙`);
    }
};
