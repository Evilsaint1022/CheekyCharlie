const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { readFile, writeFile } = require('fs/promises');
const { join } = require('path');
const fs = require('fs');

const db = require("../../Handlers/database");

module.exports = {
    // Command registration data
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your current balance or another user's balance.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the balance of')
                .setRequired(false)
        ),

    // Command execution
    async execute(interaction) {

        // Get the target user (either the command executor or a mentioned user)
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const { guild } = interaction;

        // Get values from database
        const balance = await db.economy.get(guild.id + "." + targetUser.id + ".balance") || 0;
        const bank    = await db.economy.get(guild.id + "." + targetUser.id + ".bank") || 0;

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF) // White color
            .setTitle(`**${targetUser.username}'s Balance**`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🪙 Wallet', value: `${balance} Coins`, inline: true },
                { name: '🏦 Bank', value: `${bank} Coins`, inline: true }
            )
            .setFooter({ text: 'Use Your Coins Wisely!' })
            .setTimestamp();

        // Reply with the embed
        await interaction.reply({ embeds: [embed] });

        // Console Logs
        console.log(`[${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${interaction.user.username} used the balance command. ${targetUser.username}'s balance was checked.`);
    }
};
