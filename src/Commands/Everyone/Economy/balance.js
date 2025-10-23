const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");
const { timeStamp } = require('console');
const { text } = require('stream/consumers');

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

        const space = 'ㅤ'
        
        function padText(text, padLength = 3) {
        return `${space}`.repeat(padLength) + text + `${space}`.repeat(padLength);
        }

        const top =    `**╭─── 🌿${targetUser.username}'s Balance ───╮**`;
        const bottom = `**╰─────── Use Your Ferns Wisely! ───────╯**`;

        // Replace dots with underscores for the database key only
        const safeUsername = targetUser.username.replace(/\./g, '_');
        const dbKeyPrefix = `${safeUsername}_${targetUser.id}`;

        // Load values from DB using the safe key
        const balance = await db.wallet.get(`${dbKeyPrefix}.balance`) || 0;
        const bank = await db.bank.get(`${dbKeyPrefix}.bank`) || 0;

        const embed = new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setTitle(`${top}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: ``, value: padText(`· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`), inline: false},
            { name: padText('💰 Wallet'), value: padText(`${ferns}${balance.toLocaleString()}`), inline: true },
            { name: '🏦 Bank', value: `${ferns}${bank.toLocaleString()}`, inline: true },
            { name: ``, value: padText(`· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`), inline: false},
            { name: ``, value: `${bottom}`, inline: false},
        )

        await interaction.reply({ embeds: [embed] });

        console.log(`[🌿] [BALANCE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} ${interaction.user.username} used the balance command. ${targetUser.username}'s balance was checked.`);
    }
};
