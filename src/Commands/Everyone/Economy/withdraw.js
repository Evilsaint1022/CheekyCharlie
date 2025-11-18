const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

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
        const ferns = '<:Ferns:1395219665638391818>';
        const { guild, user } = interaction;
        const timestamp = new Date().toLocaleTimeString();

        const withdrawAmountInput = interaction.options.getInteger('amount');
        const balanceKey = `${user.id}.balance`;
        const bankKey = `${user.id}.bank`;

        // Get current balances
        let bankBalance = await db.bank.get(bankKey) || 0;
        let walletBalance = await db.wallet.get(balanceKey) || 0;

        // Use full bank balance if input is 0
        let withdrawAmount = withdrawAmountInput === 0 ? bankBalance : withdrawAmountInput;

        if (bankBalance < withdrawAmount || withdrawAmount <= 0) {
            return interaction.reply({
                content: '❌ You do not have enough Ferns in your Bank to withdraw or you entered an invalid amount.',
                flags: 64
            });
        }

        // Update balances
        bankBalance -= withdrawAmount;
        walletBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.wallet.set(balanceKey, walletBalance);

        const embed = new EmbedBuilder()
            .setColor('#de4949')
            .setTitle(`**${user.username}'s Withdrawal**`)
            .setDescription(`Successfully withdrew **${ferns}${withdrawAmount.toLocaleString()}**`)
            .addFields(
                { name: '🪙 Wallet Balance', value: `${ferns}${walletBalance.toLocaleString()}`, inline: true },
                { name: '🏦 Bank Balance', value: `${ferns}${bankBalance.toLocaleString()}`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Your Wallet is Growing!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Console log
        console.log(`[🌿] [WITHDRAW] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the withdraw command. Withdrawal Amount: ${withdrawAmount.toLocaleString()} Ferns.`);
    }
};
