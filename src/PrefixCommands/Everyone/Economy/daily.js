// daily.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours
const baseRewardAmount = 100; // Base daily reward

module.exports = {
    name: "daily",
    description: "Claim your daily Ferns!",

    async execute(message, args) {
        
        if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

        const ferns = '<:Ferns:1395219665638391818>';
        const { author, guild, member } = message;
        const username = author.username;
        const userId = author.id;

        const timestamp = new Date().toLocaleTimeString();
        const space = 'ㅤ';

        const top = `**────── 🌿${username}'s Daily ──────**`;
        const middle = `**· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·**`;
        const bottom = `**────── Come back tomorrow for more! ──────**`;

        // ------------------------------------------------------
        // 1️⃣ MIGRATION — move username-based keys → ID-only keys
        // ------------------------------------------------------
        const safeUsername = username.replace(/\./g, '_');
        const oldKey = `${safeUsername}_${userId}`;
        const newKey = `${userId}`;

        const oldWalletObj = await db.wallet.get(oldKey);
        const oldBankObj = await db.bank.get(oldKey);
        const oldLastClaimObj = await db.lastclaim.get(oldKey);

        if (oldWalletObj !== undefined) {
            await db.wallet.set(newKey, oldWalletObj);
            await db.wallet.delete(oldKey);
        }

        if (oldBankObj !== undefined) {
            await db.bank.set(newKey, oldBankObj);
            await db.bank.delete(oldKey);
        }

        if (oldLastClaimObj !== undefined) {
            await db.lastclaim.set(newKey, oldLastClaimObj);
            await db.lastclaim.delete(oldKey);
        }
        // ------------------------------------------------------

        const lastClaim = await db.lastclaim.get(`${newKey}.daily`) || 0;
        const currentTime = Date.now();

        // Cooldown check
        if (currentTime - lastClaim < dailyCooldown) {
            const timeLeft = dailyCooldown - (currentTime - lastClaim);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            return message.reply(
                `⏳You have already claimed your daily reward!\n` +
                `Please wait **${hours}h ${minutes}m ${seconds}s** before claiming again.`
            );
        }

        // Booster role check
        const guildSettings = await db.settings.get(`${guild.id}`) || {};
        const boosterRoleId = guildSettings.boostersRoleId;

        let rewardAmount = baseRewardAmount;
        if (boosterRoleId && member.roles.cache.has(boosterRoleId)) {
            rewardAmount *= 2;
        }

        // Get balances
        let bank = await db.bank.get(`${newKey}.bank`) || 0;
        let balance = await db.wallet.get(`${newKey}.balance`) || 0;

        // Add reward
        balance += rewardAmount;

        // Save
        await db.wallet.set(`${newKey}.balance`, balance);
        await db.lastclaim.set(`${newKey}.daily`, currentTime);

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(top)
            .setDescription(
                `You have claimed your daily reward of **${ferns}・${rewardAmount.toLocaleString()}**!\n` +
                `ㅤㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤㅤ💰 Walletㅤㅤㅤㅤ🏦 Bank\n` +
                `ㅤㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤㅤ${ferns}・${bank.toLocaleString()}\n` +
                `ㅤㅤㅤㅤ${middle}\n${space}\n${bottom}`
            )
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setColor(0x207e37);

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [DAILY] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${username} used the daily command and got ${rewardAmount} Ferns.`
        );
    }
};
