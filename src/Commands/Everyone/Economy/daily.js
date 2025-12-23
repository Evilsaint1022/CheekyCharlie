// daily.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours
const baseRewardAmount = 100; // Base daily reward

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily Ferns!'),

    async execute(interaction) {
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const ferns = '<:Ferns:1395219665638391818>';
        const { user, guild, member } = interaction;
        const username = user.username;
        const keyBase = `${user.id}`;
        const timestamp = new Date().toLocaleTimeString();
        const space = 'ㅤ';

        const top = `**────── 🌿${username}'s Daily ──────**`;
        const middle = `**· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·**`;
        const bottom = `**────── Come back tomorrow for more! ──────**`;

        // ------------------------------------------------------
        // 1️⃣ MIGRATION — move username-based keys → ID-only keys
        // ------------------------------------------------------
        const safeUsername = user.username.replace(/\./g, '_');

        const oldKey = `${safeUsername}_${user.id}`;
        const newKey = `${user.id}`;

        const oldWalletObj = await db.wallet.get(oldKey);
        const oldBankObj = await db.bank.get(oldKey);
        const oldLastClaimObj = await db.lastclaim.get(oldKey);

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

        // Move lastclaim if exists
        if (oldLastClaimObj !== undefined) {
            await db.lastclaim.set(newKey, oldLastClaimObj);
            await db.lastclaim.delete(oldKey);
        }
        // ------------------------------------------------------

        // After migration, everything uses the new ID-only key.
        const lastClaim = await db.lastclaim.get(`${newKey}.daily`) || 0;
        const currentTime = Date.now();

        if (currentTime - lastClaim < dailyCooldown) {
            const timeLeft = dailyCooldown - (currentTime - lastClaim);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            return interaction.reply({
                content: `You have already claimed your daily reward! Please wait **${hours}h ${minutes}m ${seconds}s** before claiming again.`,
                flags: 64,
            });
        }

        // Check for booster role
        const guildKey = `${guild.id}`;
        const guildSettings = await db.settings.get(guildKey) || {};
        const boosterRoleId = guildSettings.boostersRoleId;

        // Determine reward
        let rewardAmount = baseRewardAmount;
        if (boosterRoleId && member.roles.cache.has(boosterRoleId)) {
            rewardAmount *= 2;
        }

        // Get balances AFTER migration
        let bank = await db.bank.get(`${newKey}.bank`) || 0;
        let balance = await db.wallet.get(`${newKey}.balance`) || 0;

        // Add reward
        balance += rewardAmount;

        // Save new values
        await db.wallet.set(`${newKey}.balance`, balance);
        await db.lastclaim.set(`${newKey}.daily`, currentTime);

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(`${top}`)
            .setDescription(
                `You have claimed your daily reward of **${ferns}・${rewardAmount.toLocaleString()}**!\n` +
                `ㅤㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤㅤ💰 Walletㅤㅤㅤㅤ🏦 Bank\n` +
                `ㅤㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤㅤ${ferns}・${bank.toLocaleString()}\n` +
                `ㅤㅤㅤㅤ${middle}\n${space}\n${bottom}`
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setColor('#de4949');

        await interaction.reply({ embeds: [embed] });

       console.log(`[🌿] [DAILY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${username} used the daily command and got ${rewardAmount} Ferns.`);
    }
};
