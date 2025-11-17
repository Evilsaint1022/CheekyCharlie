const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

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
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64 // ephemeral
            });
        }
        const ferns = '<:Ferns:1395219665638391818>';
        const timestamp = new Date().toLocaleTimeString();
        const { guild, user } = interaction;

        // Replace all dots in username with underscores for DB keys
        const safeUsername = user.username.replace(/\./g, '_');

        // Get the deposit amount from the options
        let depositAmount = interaction.options.getInteger('amount');

        // Get current balances
        let balance = await db.wallet.get(`${safeUsername}_${user.id}.balance`) || 0;
        let bank = await db.bank.get(`${safeUsername}_${user.id}.bank`) || 0;

        // If depositAmount is 0, deposit all wallet points
        if (depositAmount === 0) {
            depositAmount = balance;
        }

        // Validate deposit amount
        if (balance < depositAmount || depositAmount <= 0) {
            return interaction.reply({
                content: '❌ You do not have enough points to deposit or you entered an invalid amount.',
                flags: 64
            });
        }

        // Update balances
        balance -= depositAmount;
        bank += depositAmount;

        await db.wallet.set(`${safeUsername}_${user.id}.balance`, balance);
        await db.bank.set(`${safeUsername}_${user.id}.bank`, bank);

        // Create embed response
        const embed = new EmbedBuilder()
            .setColor('#de4949')
            .setTitle(`**${user.username}'s Deposit**`)
            .setDescription(`Successfully deposited **${ferns}${depositAmount.toLocaleString()}**`)

            .addFields(
                { name: '🪙 Wallet Balance', value: `${ferns}${balance.toLocaleString()}`, inline: true },
                { name: '🏦 Bank Balance', value: `${ferns}${bank.toLocaleString()}`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Your Savings are Growing!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Console log
        console.log(`[🌿] [DEPOSIT] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the deposit command. Deposit Amount: ${depositAmount.toLocaleString()} Ferns`);
    },
};
