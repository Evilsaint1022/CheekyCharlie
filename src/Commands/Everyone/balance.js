const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const db = require("../../Handlers/database");

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
        const ferns = "<:Ferns:1395219665638391818>"
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const { guild } = interaction;

        // Replace dots with underscores for the database key only
        const safeUsername = targetUser.username.replace(/\./g, '_');
        const dbKeyPrefix = `${safeUsername}_${targetUser.id}`;

        // Load values from DB using the safe key
        const balance = await db.balance.get(`${dbKeyPrefix}.balance`) || 0;
        const bank = await db.bank.get(`${dbKeyPrefix}.bank`) || 0;

        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setTitle(`**${targetUser.username}'s Balance**`) // Show original username for display
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🪙 Wallet', value: `${balance} ${ferns}`, inline: true },
                { name: '🏦 Bank', value: `${bank} ${ferns}`, inline: true }
            )
            .setFooter({ text: `Use Your Ferns Wisely!` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        console.log(`[${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${interaction.user.username} used the balance command. ${targetUser.username}'s balance was checked.`);
    }
};
