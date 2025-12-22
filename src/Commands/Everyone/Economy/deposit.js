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
                flags: 64
            });
        }

        
        const { guild, user } = interaction;

        const top = `**──── 🌿${user.username}'s Deposit ────**`
        const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`
        const space = 'ㅤ'
        const ferns = '<:Ferns:1395219665638391818>';

        const safeUsername = user.username.replace(/\./g, '_');

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

        let balance = await db.wallet.get(`${newKey}.balance`) || 0;
        let bank = await db.bank.get(`${newKey}.bank`) || 0;

        // Deposit amount
        let depositAmount = interaction.options.getInteger('amount');
        if (depositAmount === 0) depositAmount = balance;

        if (depositAmount <= 0 || balance < depositAmount) {
            return interaction.reply({
                content: '❌ You do not have enough points to deposit or you entered an invalid amount.',
                flags: 64
            });
        }

        balance -= depositAmount;
        bank += depositAmount;

        // Save
        await db.wallet.set(`${newKey}.balance`, balance);
        await db.bank.set(`${newKey}.bank`, bank);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setTitle(`${top}`)
            .setDescription(
                `_Successfully deposited **${ferns}・${depositAmount.toLocaleString()}**_\n` +
                `ㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\n` +
                `ㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤ  ${ferns}・${bank.toLocaleString()}\n` +
                `ㅤㅤㅤ${middle}\n`
    )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '🌿Thanks for using Bank-NZ' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        console.log(
            `[🌿] [DEPOSIT] ${guild.name} (${guild.id}) ${user.tag} deposited ${depositAmount} Ferns.`
        );
    },
};
