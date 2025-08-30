const { Events, ChannelType, ContainerBuilder, TextDisplayBuilder, MessageFlags, SeparatorBuilder } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
name: Events.MessageCreate,

/**
 * @param {Message} message
 * @param {Client} client
 */
async execute(message, client) {
    if (message.author.bot) return;

    if (!message.channel.isDMBased()) return;

    const userId = message.author.id;

    const applications = await db.staff_app_applications.get('applications') || [];
    const activeApplication = applications.find(app =>
        app.userId === userId && (app.status === 'in_progress' || app.status === 'pending')
    );

    if (!activeApplication) return;

    const guildName = activeApplication.guildName;
    const guildId = activeApplication.guildId;

    if (message.content.toLowerCase() === '!cancel') {
        const applications = await db.staff_app_applications.get('applications') || [];
        const index = applications.findIndex(app => app.userId === userId && (app.status === 'in_progress' || app.status === 'pending'));
        if (index !== -1) {
            applications.splice(index, 1);
            await db.staff_app_applications.set('applications', applications);
        }

        await message.reply({ flags: [MessageFlags.IsComponentsV2], components: [
            new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("**❌ Application canceled**")
            )
        ] });

        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${message.author.username} cancelled staff application`);
        return;
    }

    if (activeApplication.status === 'pending') {
        await handlePendingApplicationMessage(message, client, activeApplication, guildName, guildId);
        return;
    }

    const questionsKey = `${guildName}_${guildId}.questions`;
    const questions = await db.staff_app_questions.get(questionsKey) || [];    if (questions.length === 0) {
        await message.reply('❌ Application questions are no longer available.');
        return;
    }

    const currentQuestionIndex = activeApplication.currentQuestion;
    const currentQuestion = questions[currentQuestionIndex];

    if (!currentQuestion) {
        await message.reply('❌ An error occurred with your application.');
        return;
    }

    activeApplication.answers.push({
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        answer: message.content
    });

    if (currentQuestionIndex + 1 >= questions.length) {
        await finalizeApplication(message, client, activeApplication, guildName, guildId, questions);
    } else {

        activeApplication.currentQuestion = currentQuestionIndex + 1;
        const nextQuestion = questions[currentQuestionIndex + 1];

        const applications = await db.staff_app_applications.get('applications') || [];
        const appIndex = applications.findIndex(app => app.userId === userId && app.status === 'in_progress');
        if (appIndex !== -1) {
            applications[appIndex] = activeApplication;
            await db.staff_app_applications.set('applications', applications);
        }

        const progressEmbed = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Question ${currentQuestionIndex + 2} of ${questions.length}:**\n${nextQuestion.question}\n\n-# Reply with your answer. Type "!cancel" to stop.`)
        );

        await message.reply({ components: [progressEmbed], flags: [MessageFlags.IsComponentsV2] });

    }
}};

async function handlePendingApplicationMessage(message, client, application, guildName, guildId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            await message.reply('❌ Could not access the server.');
            return;
        }

        const thread = guild.channels.cache.get(application.threadId);
        if (!thread) {
            await message.reply('❌ Could not find your application thread.');
            return;
        }

        const userEmbed = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${message.content || "*No content*"}\n-# ${message.author.displayName}`)
        );

        await thread.send({
            components: [userEmbed],
            flags: [MessageFlags.IsComponentsV2]
        });

        await message.react('✅');

        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${message.author.username} sent message to staff thread`);

    } catch (error) {
        console.error('Error forwarding user message to staff thread:', error);
        await message.reply('❌ Could not send your message to staff. Please try again.');
    }
}

async function finalizeApplication(message, client, application, guildName, guildId, questions) {
    try {

        const channelKey = `${guildName}_${guildId}.channel`;
        const applicationChannelId = await db.staff_app_questions.get(channelKey);

        if (!applicationChannelId) {
            await message.reply('❌ Application channel is no longer configured.');
            return;
        }

        const guild = client.guilds.cache.get(guildId);
            if (!guild) {
            await message.reply('❌ Could not access the server.');
            return;
        }

        const applicationChannel = guild.channels.cache.get(applicationChannelId);
            if (!applicationChannel) {
            await message.reply('❌ Application channel no longer exists.');
            return;
        }

        const thread = await applicationChannel.threads.create({
            name: `Application - ${application.userTag}`,
            reason: `Staff application thread for ${application.userTag}`,
            type: ChannelType.PublicThread,
        });

        const summaryEmbed = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Applicant:** ${application.userTag} | <@${application.userId}>`)
        );

        application.answers.forEach((answer, index) => {
            const qObj = questions.find(q => q.id === answer.questionId);
            let questionText = qObj ? qObj.question.toString().trim() : (answer.question ? answer.question.toString().trim() : 'Unknown question');
            if (!questionText.endsWith('?')) questionText;
            const fieldTitle = `Question ${index + 1} - ${questionText}`;
            const fieldValue = answer.answer.length > 1024 ? answer.answer.substring(0, 1021) + '...' : answer.answer;
            summaryEmbed.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${fieldTitle}**\n${fieldValue}`)
            );
        });

        summaryEmbed.addSeparatorComponents( new SeparatorBuilder() )
        summaryEmbed.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# To forward messages to the applicant, use `>`.")
        )
        
        await thread.send({ components: [summaryEmbed], flags: [MessageFlags.IsComponentsV2] });

        application.status = 'pending';
        application.threadId = thread.id;
        application.completedAt = new Date().toISOString();

        const applications = await db.staff_app_applications.get('applications') || [];
        const appIndex = applications.findIndex(app => app.userId === application.userId && app.status === 'in_progress');
        if (appIndex !== -1) {
            applications[appIndex] = application;
            await db.staff_app_applications.set('applications', applications);
        }

        const completionEmbed = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**✅ Application Submitted!**\n-# Your staff application has been submitted successfully and is now pending review by the staff team.')
        );

        await message.reply({ components: [completionEmbed], flags: [MessageFlags.IsComponentsV2] });

        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${message.author.username} completed staff application`);

    } catch (error) {

        console.error('Error finalizing application:\n', error);
        await message.reply('❌ An error occurred while submitting your application');

    }
}
