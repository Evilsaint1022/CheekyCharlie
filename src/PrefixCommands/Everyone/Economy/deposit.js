// deposit.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

module.exports = {
    name: "deposit",
    aliases: ["dep"],
    description: "Deposit points from your Wallet to your Bank.",

    async execute(message, args) {

        if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

        const { guild, author } = message;

        const top = `**🌿 __${author.username}'s Deposit!__ 🌿**`;
        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const bottom = `🌿・Thanks for using Bank-NZ`;

        const space = 'ㅤ';

        // const ferns = '<:Ferns:1473337406659891252>'; // For Testing Formatting.
        const ferns = '<:Ferns:1395219665638391818>';

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
        let balance = await db.wallet.get(`${newKey}.balance`) || 0;
        let bank = await db.bank.get(`${newKey}.bank`) || 0;

        // Parse deposit amount
        // !deposit 100
        // !deposit all
        let depositAmount;

        if (!args[0]) {
            return message.reply("❌ Please specify an amount to deposit.");
        }

        if (args[0].toLowerCase() === "all") {
            depositAmount = balance;
        } else {
            depositAmount = parseInt(args[0], 10);
        }

        if (!depositAmount || depositAmount <= 0 || balance < depositAmount) {
            return message.reply(
                '❌ You do not have enough points to deposit or you entered an invalid amount.'
            );
        }

        balance -= depositAmount;
        bank += depositAmount;

        // Save
        await db.wallet.set(`${newKey}.balance`, balance);
        await db.bank.set(`${newKey}.bank`, bank);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setTitle(top)
            .setDescription(
                `_Successfully deposited **${ferns}・${depositAmount.toLocaleString()}**_\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${ferns}・${balance.toLocaleString()}     ${ferns}・${bank.toLocaleString()}\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '🌿Thanks for using Bank-NZ' })

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [DEPOSIT] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} (${guild.id}) ${author.tag} deposited ${depositAmount} Ferns.`
        );
    },
};
