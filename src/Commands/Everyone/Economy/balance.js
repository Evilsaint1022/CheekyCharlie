const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, MessageFlags } = require('discord.js');
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
                flags: MessageFlags.Ephemeral
            });
        }
        const ferns = '<:Ferns:1395219665638391818>';
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const { guild } = interaction;

        const space = 'ㅤ';

        const top =    `**──── 🌿${targetUser.username}'s Balance ────**`;
        const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
        const bottom = `**──────── Use Your Ferns Wisely! ────────**`;

        // Replace dots with underscores for the database key only
        const safeUsername = targetUser.username.replace(/\./g, '_');
        const dbKeyPrefix = `${safeUsername}_${targetUser.id}`;

        // Load values from DB using the safe key
        const balance = await db.wallet.get(`${dbKeyPrefix}.balance`) || 0;
        const bank = await db.bank.get(`${dbKeyPrefix}.bank`) || 0;

        const embed = new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setTitle(`${top}`)
        .setDescription(`ㅤㅤㅤㅤ${middle}\nㅤㅤㅤㅤ💰 Walletㅤㅤㅤㅤ🏦 Bank\nㅤㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤㅤ${ferns}・${bank.toLocaleString()}\nㅤㅤㅤㅤ${middle}\n${space}\n${bottom}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        console.log(`[🌿] [BALANCE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.username} used the balance command. ${targetUser.username}'s balance was checked.`);
    }
};
