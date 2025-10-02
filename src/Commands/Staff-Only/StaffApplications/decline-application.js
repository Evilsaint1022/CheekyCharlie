const { SlashCommandBuilder, PermissionsBitField, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js')
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decline-application')
        .setDescription('Decline a staff application (use in application thread).')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for declining the application')
                .setRequired(false)
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

        if (!interaction.channel.isThread()) {
            return interaction.reply({
                content: '❌ This command can only be used in a staff application thread.',
                flags: 64
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const threadId = interaction.channel.id;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const applications = await db.staff_app_applications.get('applications') || [];
        const applicationIndex = applications.findIndex(app => app.threadId === threadId);

        if (applicationIndex === -1) {
            return interaction.reply({
                content: '❌ Could not find the application associated with this thread.',
                flags: 64
            });
        }

        const application = applications[applicationIndex];

        applications.splice(applicationIndex, 1);
        await db.staff_app_applications.set('applications', applications);

        let applicant;

        try {
            applicant = await interaction.client.users.fetch(application.userId);

            const declinedContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("**❌ Application declined!**\n-# Reason: " + reason)
            )

            await applicant.send({ components: [declinedContainer], flags: [MessageFlags.IsComponentsV2] });

        } catch (error) {
            console.error('Error DMing applicant:', error);
        }

        await interaction.channel.send({
            components: [
                new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**❌ Application declined.**\n-# Declined by " + interaction.user.displayName)
                )
            ],
            flags: [MessageFlags.IsComponentsV2]
        })

        console.log(`[⭐] [DECLINE-APPLICATION] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ")}] ${guildName} ${guildId} ${interaction.user.username} declined staff application for user ${application.userId}. Reason: ${reason}`);

        await interaction.reply({
            content: '✅ Application declined successfully!',
            flags: 64
        });

        await interaction.channel.setName("[❌] " + applicant.username)
        await interaction.channel.setLocked(true);
        await interaction.channel.setArchived(true);

    },
};
