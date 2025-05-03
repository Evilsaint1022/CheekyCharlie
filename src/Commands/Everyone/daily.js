// daily.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const db = require("../../Handlers/database");

const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const rewardAmount = 100; // Points to give

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily points!'),

    async execute(interaction) {
        const { user, guild } = interaction;
        const timestamp = new Date().toLocaleTimeString();
        const guildIconUrl = guild.iconURL({ dynamic: true, format: 'png' }) || '';

        const lastClaim = await db.lastclaim.get(user.username + "_" + user.id + ".lastClaim") || 0;

        const currentTime = Date.now();

        if (currentTime && (currentTime - lastClaim < dailyCooldown)) {
            const timeLeft = dailyCooldown - (currentTime - lastClaim);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            return interaction.reply({
                content: `You have already claimed your daily reward! Please wait **${hours}h ${minutes}m ${seconds}s** before claiming again.`,
                flags: 64,
            });
        }

        let balance = await db.balance.get(user.username + "_" + user.id + ".balance") || 0;

        balance += rewardAmount;

        await db.balance.set(user.username + "_" + user.id + ".balance", balance);

        await db.lastclaim.set(user.username + "_" + user.id + ".lastClaim", currentTime);

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF) // Green color
            .setTitle(`${user.username}'s Daily Coins`)
            .setDescription(`You have claimed your daily reward of **${rewardAmount} Coins🪙**!`)
            .addFields(
                { name: 'Total Balance', value: `${balance} Coins`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Come back tomorrow for more!' })
            .setTimestamp();

        // Reply with the embed
        await interaction.reply({ embeds: [embed] });

        // Console Logs
        console.log(`[${timestamp}] ${guild.name} ${guild.id} ${interaction.user.username} used the daily command.`);
    }
};
