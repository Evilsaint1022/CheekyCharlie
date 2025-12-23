// balance.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

module.exports = {
    name: "balance",
    aliases: ["bal"],
    description: "Check your current balance or another user's balance.",

    async execute(message, args) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply("This command cannot be used in DMs.");
        }

        const ferns = '<:Ferns:1395219665638391818>';
        const { guild, author } = message;

        // Resolve target user:
        // !balance           -> self
        // !balance @user     -> mentioned user
        // !balance userID    -> ID lookup
        const targetUser =
            message.mentions.users.first() ||
            (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
            author;

        const space = 'ㅤ';

        const top = `**──── 🌿${targetUser.username}'s Balance ────**`;
        const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
        const bottom = `**──────── Use Your Ferns Wisely! ────────**`;

        // ------------------------------------------------------
        // 1️⃣ MIGRATION — move username-based keys → ID-only keys
        // ------------------------------------------------------
        const safeUsername = targetUser.username.replace(/\./g, '_');
        const oldKey = `${safeUsername}_${targetUser.id}`;
        const newKey = `${targetUser.id}`;

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
        // ------------------------------------------------------

        // DB lookup AFTER migration
        const balance = await db.wallet.get(`${newKey}.balance`) || 0;
        const bank = await db.bank.get(`${newKey}.bank`) || 0;

        // Embed
        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setTitle(top)
            .setDescription(
                `_You are viewing ${targetUser.username}'s balance._\n` +
                `ㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\n` +
                `ㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤ  ${ferns}・${bank.toLocaleString()}\n` +
                `ㅤㅤㅤ${middle}`
            )
            .setFooter({ text: '🌿Thanks for using Bank-NZ' })
            .setTimestamp()
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [BALANCE] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${author.username} used the balance command. ` +
            `${targetUser.username}'s balance was checked.`
        );
    }
};
