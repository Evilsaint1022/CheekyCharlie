const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-staff-app-channel')
        .setDescription('Remove the staff application channel.'),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                flags: 64
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;

        const channelKey = `${guildName}_${guildId}.channel`;
        const existingChannel = await db.staff_app_questions.get(channelKey);

        if (!existingChannel) {
            return interaction.reply({
                content: '❌ No staff application channel is currently set.',
                flags: 64
            });
        }

        await db.staff_app_questions.delete(channelKey);

        console.log(`[REMOVE-STAFF-APP-CHANNEL] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} removed staff application channel`);

        await interaction.reply({
            content: '✅ Staff application channel removed successfully.',
            flags: 64
        });
    },
};
