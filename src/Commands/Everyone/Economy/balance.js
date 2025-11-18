const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your current balance or another user's balance.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the balance of')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const ferns = '<:Ferns:1395219665638391818>';
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const { guild } = interaction;

        const space = 'ㅤ';

        const top =    `**──── 🌿${targetUser.username}'s Balance ────**`;
        const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
        const bottom = `**──────── Use Your Ferns Wisely! ────────**`;

        // ------------------------------------------------------
        // 1️⃣ MIGRATION — move username-based keys → ID-only keys
        // ------------------------------------------------------
        const safeUsername = targetUser.username.replace(/\./g, '_');

        const oldKey = `${safeUsername}_${targetUser.id}`; // old format
        const newKey = `${targetUser.id}`;                 // new format

        const oldWalletObj = await db.wallet.get(oldKey);
        const oldBankObj = await db.bank.get(oldKey);

        // Move wallet if exists
        if (oldWalletObj !== undefined) {
            await db.wallet.set(newKey, oldWalletObj);
            await db.wallet.delete(oldKey);
        }

        // Move bank if exists
        if (oldBankObj !== undefined) {
            await db.bank.set(newKey, oldBankObj);
            await db.bank.delete(oldKey);
        }
        // ------------------------------------------------------

        // DB lookup AFTER migration so the new keys are used
        const balance = await db.wallet.get(`${newKey}.balance`) || 0;
        const bank = await db.bank.get(`${newKey}.bank`) || 0;

        const embed = new EmbedBuilder()
            .setColor('#de4949')
            .setTitle(`${top}`)
            .setDescription(
                `_You are viewing ${targetUser.username}'s balance._\n` +
                `ㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\n` +
                `ㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤ  ${ferns}・${bank.toLocaleString()}\n` +
                `ㅤㅤㅤ${middle}\n${space}\n${bottom}`
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

        await interaction.reply({ embeds: [embed] });

        console.log(`[🌿] [BALANCE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.username} used the balance command. ${targetUser.username}'s balance was checked.`);
    }
};