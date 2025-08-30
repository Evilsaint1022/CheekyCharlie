const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-staff-app-channel')
        .setDescription('Set the channel where staff applications will be posted.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel for staff applications')
                .setRequired(true)
        ),

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
        const channel = interaction.options.getChannel('channel');

        if (channel.type !== 0) {
            return interaction.reply({
                content: '❌ Please select a text channel.',
                flags: 64
            });
        }

        const channelKey = `${guildName}_${guildId}.channel`;
        await db.staff_app_questions.set(channelKey, channel.id);

        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} set staff application channel to #${channel.name}`);

        await interaction.reply({
            content: `✅ Staff application channel set to <#${channel.id}>`,
            flags: 64
        });
    },
};
