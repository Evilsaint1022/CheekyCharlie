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
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64 // Makes the reply ephemeral
            });
        }

        const { guild, user } = interaction;
        const timestamp = new Date().toLocaleTimeString();

        // Replace all dots in username with underscores for the DB key
        const safeUsername = user.username.replace(/\./g, '_');

        const withdrawAmountInput = interaction.options.getInteger('amount');
        const balanceKey = `${safeUsername}_${user.id}.balance`;
        const bankKey = `${safeUsername}_${user.id}.bank`;

        // Get current balances
        let bankBalance = await db.bank.get(bankKey) || 0;
        let walletBalance = await db.balance.get(balanceKey) || 0;

        // Use full bank balance if input is 0
        let withdrawAmount = withdrawAmountInput === 0 ? bankBalance : withdrawAmountInput;

        if (bankBalance < withdrawAmount || withdrawAmount <= 0) {
            return interaction.reply({
                content: '❌ You do not have enough points in your Bank to withdraw or you entered an invalid amount.',
                flags: 64
            });
        }

        // Update balances
        bankBalance -= withdrawAmount;
        walletBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.balance.set(balanceKey, walletBalance);

        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setTitle(`**${user.username}'s Withdrawal**`)
            .setDescription(`Successfully withdrew **${withdrawAmount} Coins 🪙** from your Bank to your Wallet.`)
            .addFields(
                { name: '🪙 Wallet Balance', value: `${walletBalance} Coins`, inline: true },
                { name: '🏦 Bank Balance', value: `${bankBalance} Coins`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Your Wallet is Growing!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Console log
        console.log(`[${timestamp}] ${guild.name} ${guild.id} ${user.username} used the withdraw command. Withdrawal Amount: ${withdrawAmount} Coins 🪙`);
    }
};
