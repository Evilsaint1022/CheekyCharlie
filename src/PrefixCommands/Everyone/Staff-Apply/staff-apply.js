const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
    name: 'staff-apply',
    aliases: ['apply', 'staffapply'],

    async execute(message, args) {

        // Prevent usage in DMs
        if (!message.guild) {
            return message.reply('This command cannot be used in DMs.');
        }

        const guildId = message.guild.id;
        const guildName = message.guild.name;
        const userId = message.author.id;

        const staffsettings = await db.settings.get(`${guildId}.staffapplications`);

        if (staffsettings !== true) {
            return message.reply(
                '❌ Staff applications are closed.'
            );
        }

        const applications =
            await db.staff_app_applications.get('applications') || [];

        const existingApplication = applications.find(app =>
            app.userId === userId &&
            (app.status === 'pending' || app.status === 'in_progress')
        );

        if (existingApplication) {
            const statusMessage =
                existingApplication.status === 'pending'
                    ? '❌ You already have a pending application. Please wait for it to be reviewed.'
                    : '❌ You already have an active application in progress. Please wait for it to be reviewed or contact staff.';

            return message.reply(statusMessage);
        }

        const questionsKey = `${guildId}.questions`;
        const questions =
            await db.staff_app_questions.get(questionsKey) || [];

        if (questions.length === 0) {
            return message.reply(
                '❌ Staff applications are not set up for this server yet. Please contact an administrator.'
            );
        }

        const channelKey = `${guildId}.channel`;
        const applicationChannelId =
            await db.staff_app_questions.get(channelKey);

        if (!applicationChannelId) {
            return message.reply(
                '❌ Staff application channel is not set up for this server yet. Please contact an administrator.'
            );
        }

        const newApplication = {
            userId: userId,
            userTag: message.author.tag,
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
            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Staff application for **${guildName}**.\n\n` +
                        `**Question 1 of ${questions.length}:**\n` +
                        `${questions[0].question}\n\n` +
                        `-# Reply to this DM with your answer. Type "!cancel" to stop the application.`
                    )
                );

            await message.author.send({
                components: [dmContainer],
                flags: [MessageFlags.IsComponentsV2]
            });

            await message.reply(
                '✅ Application started! Check your DMs to begin answering questions.'
            );

        } catch (error) {
            // Roll back application if DM fails
            applications.pop();
            await db.staff_app_applications.set('applications', applications);

            console.error('Error DMing user:\n', error);

            return message.reply(
                '❌ I couldn’t send you a DM. Please make sure your DMs are open and try again.'
            );
        }

        console.log(
            `[🌿] [STAFF-APPLY] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
            `${guildName} ${guildId} ${message.author.username} started staff application`
        );
    }
};
