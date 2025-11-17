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

        // Replace dots with underscores for the database key only
        const dbKeyPrefix = `${targetUser.id}`;

        // Load values from DB using the safe key
        const balance = await db.wallet.get(`${dbKeyPrefix}.balance`) || 0;
        const bank = await db.bank.get(`${dbKeyPrefix}.bank`) || 0;

        const embed = new EmbedBuilder()
        .setColor('#de4949')
        .setTitle(`${top}`)
        .setDescription(`_You are viewing ${targetUser.username}'s balance._\nㅤㅤㅤ${middle}\nㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\nㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤ  ${ferns}・${bank.toLocaleString()}\nㅤㅤㅤ${middle}\n${space}\n${bottom}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))

        await interaction.reply({ embeds: [embed] });

        console.log(`[🌿] [BALANCE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.username} used the balance command. ${targetUser.username}'s balance was checked.`);
    }
};
