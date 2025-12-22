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
                flags: 64
            });
        }

        const { guild, user } = interaction;
        const ferns = '<:Ferns:1395219665638391818>';
        const safeUsername = user.username.replace(/\./g, '_');

        const top = `**──── 🌿${user.username}'s Withdrawal ────**`
        const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`
        const space = 'ㅤ'

        // Old key format (FULL OBJECT)
        const oldKey = `${safeUsername}_${user.id}`;

        // New ID-only key
        const newKey = `${user.id}`;

        // -----------------------------------
        // 🔍 DB MIGRATION — Move Old → New
        // -----------------------------------

        const oldWalletObj = await db.wallet.get(oldKey);
        const oldBankObj = await db.bank.get(oldKey);

        // Move wallet if exists
        if (oldWalletObj !== undefined) {
            await db.wallet.set(newKey, oldWalletObj); // copy
            await db.wallet.delete(oldKey);           // delete whole object
        }

        // Move bank if exists
        if (oldBankObj !== undefined) {
            await db.bank.set(newKey, oldBankObj);
            await db.bank.delete(oldKey);
        }

        // -----------------------------------
        // Always use ID-only key now
        // -----------------------------------

        // New clean ID-only keys
        const walletKey = `${user.id}.balance`;
        const bankKey = `${user.id}.bank`;

        const withdrawInput = interaction.options.getInteger('amount');

        let bankBalance = Number(await db.bank.get(bankKey)) || 0;
        let walletBalance = Number(await db.wallet.get(walletKey)) || 0;

        // 0 = withdraw all
        const withdrawAmount = withdrawInput === 0 ? bankBalance : withdrawInput;

        if (withdrawAmount <= 0 || withdrawAmount > bankBalance) {
            return interaction.reply({
                content: '❌ You do not have enough Ferns in your Bank to withdraw or you entered an invalid amount.',
                flags: 64
            });
        }

        // Update balances
        bankBalance -= withdrawAmount;
        walletBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.wallet.set(walletKey, walletBalance);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setTitle(`${top}`)
            .setDescription(
                `_Successfully withdrew **${ferns}・${withdrawAmount.toLocaleString()}**_\n` +
                `ㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\n` +
                `ㅤㅤㅤ${ferns}・${walletBalance.toLocaleString()}ㅤㅤㅤ  ${ferns}・${bankBalance.toLocaleString()}\n` +
                `ㅤㅤㅤ${middle}`
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '🌿Thanks for using Bank-NZ' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        console.log(
            `[🌿] [WITHDRAW] [${new Date().toLocaleDateString('en-GB')}] `
            + `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] `
            + `${guild.name} ${guild.id} ${user.username} withdrew ${withdrawAmount.toLocaleString()} Ferns.`
        );
    }
};


// console.log(`[🌿] [WITHDRAW] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${user.username} used the withdraw command. Withdrawal Amount: ${withdrawAmount.toLocaleString()} Ferns.`);


