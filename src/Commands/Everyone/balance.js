const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { readFile, writeFile } = require('fs/promises');
const { join } = require('path');
const fs = require('fs');

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

        // Generate dynamic folder paths using guild name and ID
        const balanceFolder = join(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Economy/Balance`);
        const bankFolder = join(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Economy/Bank`);

        // Ensure folders exist
        await Promise.all([
            fs.promises.mkdir(balanceFolder, { recursive: true }),
            fs.promises.mkdir(bankFolder, { recursive: true }),
        ]);

        // Read balance file
        const balancePath = join(balanceFolder, `${targetUser.username}.txt`);
        let balance = 0;
        try {
            balance = parseInt(await readFile(balancePath, 'utf8'), 10);
        } catch {
            await writeFile(balancePath, balance.toString());
        }

        // Read bank file
        const bankPath = join(bankFolder, `${targetUser.username}.txt`);
        let bank = 0;
        try {
            bank = parseInt(await readFile(bankPath, 'utf8'), 10);
        } catch {
            await writeFile(bankPath, bank.toString());
        }

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
