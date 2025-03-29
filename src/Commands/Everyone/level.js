const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

        // Define the path to the Levels folder based on the guild
        const levelsDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Economy/Levels`);
        const userLevelFilePath = path.join(levelsDir, `${targetUser.username}.json`);

        // Check if the user's level file exists
        if (!fs.existsSync(userLevelFilePath)) {
            return interaction.reply(`${targetUser.username} hasn't gained any XP yet. They need to participate to earn XP!`);
        }

        try {
            // Read the user level data from their specific JSON file
            const userData = JSON.parse(fs.readFileSync(userLevelFilePath, 'utf8'));

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
            console.error('Error reading user level data:', error);
            return interaction.reply('There was an error accessing level data. Please try again later.');
        }
    },
};
