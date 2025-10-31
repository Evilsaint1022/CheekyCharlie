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
        const safeUsername = username.replace(/\./g, '_');
        const keyBase = `${safeUsername}_${user.id}`;
        const timestamp = new Date().toLocaleTimeString();

        const space = 'ㅤ'
        
        function padText(text, padLength = 3) {
        return `${space}`.repeat(padLength) + text + `${space}`.repeat(padLength);
        }

        const top = `**────── 🌿${username}'s Daily ──────**`;
        const middle = `**· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·**`
        const bottom = `**────── Come back tomorrow for more! ──────**`;

        const lastClaim = await db.lastclaim.get(`${keyBase}.lastClaim`) || 0;
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

        // Check for booster role in server settings
        const guildKey = `${guild.name}_${guild.id}`;
        const guildSettings = await db.settings.get(guildKey) || {};
        const boosterRoleId = guildSettings.boostersRoleId;

        // Determine reward multiplier
        let rewardAmount = baseRewardAmount;
        if (boosterRoleId && member.roles.cache.has(boosterRoleId)) {
            rewardAmount *= 2;
        }

        // Get current balance
        let bank = await db.bank.get(`${keyBase}.bank`) || 0;
        let balance = await db.wallet.get(`${keyBase}.balance`) || 0;
        balance += rewardAmount;

        // Save updated values
        await db.wallet.set(`${keyBase}.balance`, balance);
        await db.lastclaim.set(`${keyBase}.lastClaim`, currentTime);

        // Build embed
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setTitle(`${top}`)
            .addFields(
                       { name: `You have claimed your daily reward of **${ferns}_${rewardAmount.toLocaleString()}_**!`, value: `ㅤㅤㅤ${middle}`, inline: false},
                       { name: `ㅤㅤ💰 Wallet` + `ㅤㅤㅤㅤ🏦 Bank`, value: '', inline: false },
                       { name: `ㅤㅤ_${ferns}・${balance.toLocaleString()}_` + `ㅤㅤㅤㅤ_${ferns}・${bank.toLocaleString()}_`, value: `ㅤㅤㅤ${middle}`, inline: false },
                       { name: `${bottom}`, value: '', inline: false},

            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))

        await interaction.reply({ embeds: [embed] });

        console.log(`[🌿] [DAILY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${username} used the daily command and got ${rewardAmount} Ferns.`);
    }
};
