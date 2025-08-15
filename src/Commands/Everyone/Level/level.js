const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription("Check your current level or another user's level.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the level of')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64 // Ephemeral
            });
        }

        const guild = interaction.guild;
        const interactionUser = interaction.user;
        const targetUser = interaction.options.getUser('user') || interaction.user;

        const guildKey = `${guild.name}_${guild.id}`;
        const userKey = `${targetUser.username}_${targetUser.id}`;

        console.log(`[${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${interactionUser.username} used the level command to get ${targetUser.username}'s level.`);

        try {
            const levelsData = await db.levels.get(guildKey);

            if (!levelsData || !levelsData[userKey]) {
                return interaction.reply({
                    content: `${targetUser.username} hasn't gained any XP yet. They need to participate to earn XP!`,
                    flags: 64
                });
            }

            const { xp, level } = levelsData[userKey];
            const nextLevelXp = level * 350 + 350;

            const embed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle(`**${targetUser.username}'s Level**`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Level', value: `${level.toLocaleString()}`, inline: true },
                    { name: 'XP', value: `${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()}`, inline: true }
                )

                .setFooter({ text: 'Keep earning XP to level up!' });

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error accessing level data:', error);
            return interaction.reply({
                content: 'There was an error accessing level data. Please try again later.',
                flags: 64
            });
        }
    },
};
