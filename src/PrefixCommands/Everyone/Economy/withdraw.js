// withdraw.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

module.exports = {
    name: "withdraw",
    aliases: ["wd"],
    description: "Withdraw points from your Bank to your Wallet.",

    async execute(message, args) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply("This command cannot be used in DMs.");
        }

        const { guild, author } = message;
        const ferns = '<:Ferns:1395219665638391818>';

        const top = `**──── 🌿${author.username}'s Withdrawal ────**`;
        const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
        const space = 'ㅤ';

        const safeUsername = author.username.replace(/\./g, '_');

        // Old key format
        const oldKey = `${safeUsername}_${author.id}`;
        const newKey = `${author.id}`;

        // -----------------------------------
        // 🔍 DB MIGRATION — Move Old → New
        // -----------------------------------
        const oldWalletObj = await db.wallet.get(oldKey);
        const oldBankObj = await db.bank.get(oldKey);

        if (oldWalletObj !== undefined) {
            await db.wallet.set(newKey, oldWalletObj);
            await db.wallet.delete(oldKey);
        }

        if (oldBankObj !== undefined) {
            await db.bank.set(newKey, oldBankObj);
            await db.bank.delete(oldKey);
        }

        // -----------------------------------
        // Always use ID-only key now
        // -----------------------------------
        const walletKey = `${newKey}.balance`;
        const bankKey = `${newKey}.bank`;

        let walletBalance = Number(await db.wallet.get(walletKey)) || 0;
        let bankBalance = Number(await db.bank.get(bankKey)) || 0;

        // Parse withdraw amount
        // !withdraw 100
        // !withdraw all
        if (!args[0]) {
            return message.reply("❌ Please specify an amount to withdraw.");
        }

        let withdrawAmount;

        if (args[0].toLowerCase() === "all") {
            withdrawAmount = bankBalance;
        } else {
            withdrawAmount = parseInt(args[0], 10);
        }

        if (!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > bankBalance) {
            return message.reply(
                '❌ You do not have enough Ferns in your Bank to withdraw or you entered an invalid amount.'
            );
        }

        // Update balances
        bankBalance -= withdrawAmount;
        walletBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.wallet.set(walletKey, walletBalance);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setTitle(top)
            .setDescription(
                `_Successfully withdrew **${ferns}・${withdrawAmount.toLocaleString()}**_\n` +
                `ㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\n` +
                `ㅤㅤㅤ${ferns}・${walletBalance.toLocaleString()}ㅤㅤㅤ  ${ferns}・${bankBalance.toLocaleString()}\n` +
                `ㅤㅤㅤ${middle}`
            )
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '🌿Thanks for using Bank-NZ' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [WITHDRAW] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${author.username} withdrew ${withdrawAmount.toLocaleString()} Ferns.`
        );
    }
};
