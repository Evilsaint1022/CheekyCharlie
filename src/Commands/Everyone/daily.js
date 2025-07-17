// daily.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require("../../Handlers/database");

const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours
const rewardAmount = 100; // Daily reward

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily points!'),

    async execute(interaction) {
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }
        const ferns = '<:Ferns:1395219665638391818>';
        const { user, guild } = interaction;
        const username = user.username;
        const safeUsername = username.replace(/\./g, '_');
        const keyBase = `${safeUsername}_${user.id}`;
        const timestamp = new Date().toLocaleTimeString();

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

        // Get current balance
        let balance = await db.balance.get(`${keyBase}.balance`) || 0;
        balance += rewardAmount;

        // Save updated values
        await db.balance.set(`${keyBase}.balance`, balance);
        await db.lastclaim.set(`${keyBase}.lastClaim`, currentTime);

        // Build embed
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setTitle(`${username}'s Daily ${ferns}`)
            .setDescription(`You have claimed your daily reward of **${rewardAmount} ${ferns}**!`)
            .addFields({ name: 'Total Balance', value: `${balance} ${ferns}`, inline: true })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Come back tomorrow for more!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        console.log(`[${timestamp}] ${guild.name} ${guild.id} ${username} used the daily command.`);
    }
};
