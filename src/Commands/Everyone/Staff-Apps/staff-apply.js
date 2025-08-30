const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff-apply')
        .setDescription('Apply to become a staff member.'),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        const applications = await db.staff_app_applications.get('applications') || [];
        const existingApplication = applications.find(app =>
            app.userId === userId && (app.status === 'pending' || app.status === 'in_progress')
        );

        if (existingApplication) {
            const statusMessage = existingApplication.status === 'pending'
                ? '❌ You already have a pending application. Please wait for it to be reviewed.'
                : '❌ You already have an active application in progress. Please wait for it to be reviewed or contact staff.';
            
            return interaction.reply({
                content: statusMessage,
                flags: 64
            });
        }

        const questionsKey = `${guildName}_${guildId}.questions`;
        const questions = await db.staff_app_questions.get(questionsKey) || [];

        if (questions.length === 0) {
            return interaction.reply({
                content: '❌ Staff applications are not set up for this server yet. Please contact an administrator.',
                flags: 64
            });
        }

        const channelKey = `${guildName}_${guildId}.channel`;
        const applicationChannelId = await db.staff_app_questions.get(channelKey);

        if (!applicationChannelId) {
            return interaction.reply({
                content: '❌ Staff application channel is not set up for this server yet. Please contact an administrator.',
                flags: 64
            });
        }

        const newApplication = {
            userId: userId,
            userTag: interaction.user.tag,
            guildId: guildId,
            guildName: guildName,
            status: 'in_progress',
            currentQuestion: 0,
            answers: [],
            startedAt: new Date().toISOString(),
            threadId: null
        };

        applications.push(newApplication);
        await db.staff_app_applications.set('applications', applications);

        try {
            const dmEmbed = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Staff application for **${interaction.guild.name}**.\n\n**Question 1 of ${questions.length}:**\n${questions[0].question}\n\n-# Reply to this DM with your answer. Type "!cancel" to stop the application.`)
            )

            await interaction.user.send({ components: [dmEmbed], flags: [MessageFlags.IsComponentsV2] });

            await interaction.reply({
                content: '✅ Application started! Check your DMs to begin answering questions.',
                flags: 64
            });

        } catch (error) {
            
            applications.pop();
            await db.staff_app_applications.set('applications', applications);
            console.error('Error DMing user:\n', error);
            return interaction.reply({
                content: '❌ I couldn\'t send you a DM. Please make sure your DMs are open and try again.',
                flags: 64
            });

        }

        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} started staff application`);
    },
};
