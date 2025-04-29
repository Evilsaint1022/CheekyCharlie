const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your current level or another user\'s level.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the level of')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Log the command usage in the console
        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const username = interaction.user.username;

        // Console Log
        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${username} used the level command.`);

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            // Fetch user level data from the economy database
            const userKey = `${guildId}_${targetUser.id}_level`;
            const userData = await db.economy.get(userKey);

            if (!userData) {
                return interaction.reply(`${targetUser.username} hasn't gained any XP yet. They need to participate to earn XP!`);
            }

            const { level: userLevel, xp: userXp } = userData;
            const nextLevelXp = userLevel * 350 + 350;

            // Create an embed to show the user's level and XP information
            const embed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle(`**${targetUser.username}'s Level**`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Level', value: `${userLevel}`, inline: true },
                    { name: 'XP', value: `${userXp} / ${nextLevelXp}`, inline: true }
                )
                .setFooter({ text: 'Keep earning XP to level up!' });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error accessing user level data:', error);
            return interaction.reply('There was an error accessing level data. Please try again later.');
        }
    },
};
