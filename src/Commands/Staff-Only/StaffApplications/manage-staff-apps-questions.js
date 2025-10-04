const { SlashCommandBuilder, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-staff-apps-questions')
        .setDescription('Manage staff application questions with an interactive GUI.'),

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
        const questionsKey = `${guildName}_${guildId}.questions`;

        const questions = await db.staff_app_questions.get(questionsKey) || [];

        const mainContainer = createMainInterface(questions);

        const response = await interaction.reply({
            components: [mainContainer],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = response.createMessageComponentCollector({});

        response.collector = collector;

        collector.on('collect', async (buttonInteraction) => {
            await handleButtonInteraction(buttonInteraction, questionsKey, questions, response);
        });

        collector.on('end', () => {
            try {
                if (response.endedByStop) return;
                const disabledContainer = createMainInterface(questions, true);
                response.edit({ components: [disabledContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (error) {
                console.error('Error disabling buttons:', error);
            }
        });
    },
};

function createMainInterface(questions, disabled = false) {
    let questionsList = "**Staff Application Questions Manager**\n\n";

    if (questions.length === 0) {
        questionsList += "No questions set up yet!\n\nClick 'Add Question' to get started!";
    } else {
        questions.forEach((q, index) => {
            questionsList += `**${index + 1}.** ${q.question}\n`;
        });
        questionsList += `\nTotal: ${questions.length} questions`;
    }

    const textDisplay = {
        type: 10,
        content: questionsList
    };

    const addButton = new ButtonBuilder()
        .setCustomId('add_question')
        .setLabel('Add Question')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled);

    const removeButton = new ButtonBuilder()
        .setCustomId('remove_question')
        .setLabel('Remove Question')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled || questions.length === 0);

    const moveButton = new ButtonBuilder()
        .setCustomId('move_question')
        .setLabel('Move Question')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || questions.length < 2);

    const stopButton = new ButtonBuilder()
        .setCustomId('stop_questions')
        .setLabel('Stop')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled);

    const actionRow1 = new ActionRowBuilder().addComponents(addButton, removeButton);
    const actionRow2 = new ActionRowBuilder().addComponents(moveButton, stopButton);

    const container = {
        type: 17,
        components: [textDisplay, actionRow1, actionRow2]
    };

    return container;
}

async function safeDefer(interaction) {
    if (!interaction.isRepliable()) return;
    if (interaction.deferred || interaction.replied) return;
    try {
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            await interaction.deferUpdate();
        }
    } catch (e) {

    }
}

async function handleButtonInteraction(buttonInteraction, questionsKey, questions, response) {
    const action = buttonInteraction.customId;

    if (buttonInteraction.isStringSelectMenu()) {
        switch (action) {
            case 'select_remove_question':
                await handleRemoveSelect(buttonInteraction, questionsKey, response);
                break;
            case 'select_move_question':
                await handleMoveSelect(buttonInteraction, questionsKey, response);
                break;
        }
        return;
    }

    switch (action) {
        case 'add_question':
            await showAddQuestionInterface(buttonInteraction, questionsKey, response);
            break;

        case 'remove_question':
            await showRemoveQuestionInterface(buttonInteraction, questions, questionsKey, response);
            break;

        case 'move_question':
            await showMoveQuestionInterface(buttonInteraction, questions, questionsKey, response);
            break;

        case 'stop_questions':

            response.endedByStop = true;

            if (response.collector && !response.collector.ended) {
                try { response.collector.stop('stopped'); } catch (_) {}
            }
            await stopInterface(buttonInteraction, questionsKey, response);
            break;

        case 'confirm_add':
        case 'cancel_add':
            await handleAddFlow(buttonInteraction, questionsKey, response);
            break;

        case 'cancel_remove':
            await handleRemoveFlow(buttonInteraction, questionsKey, response);
            break;

        case 'cancel_move':
            await handleMoveFlow(buttonInteraction, questionsKey, response);
            break;

        default:

            if (action.startsWith('move_up_') || action.startsWith('move_down_')) {
                await handleMoveFlow(buttonInteraction, questionsKey, response);
            }

            break;
    }
}

async function showAddQuestionInterface(interaction, questionsKey, response) {
    const container = {
        type: 17,
        components: [
            {
                type: 10,
                content: "**Add New Question**\n\nPlease type your question in the chat below and click 'Confirm' when done."
            },
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_add')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_add')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            )
        ]
    };

    await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });

    const filter = (m) => m.author.id === interaction.user.id;
    try {
        const collected = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            errors: ['time']
        });

        const questionText = collected.first().content;
        await collected.first().delete();

        const tempData = await db.staff_app_questions.get('temp_add') || {};
        tempData[interaction.user.id] = questionText;
        await db.staff_app_questions.set('temp_add', tempData);

    } catch (error) {
        await refreshInterface(interaction, questionsKey, response);
    }
}

async function showRemoveQuestionInterface(interaction, questions, questionsKey, response) {

    const currentQuestions = await db.staff_app_questions.get(questionsKey) || [];

    const options = currentQuestions.map((q, index) => ({
        label: `Question ${index + 1}`,
        description: q.question.length > 50 ? q.question.substring(0, 47) + '...' : q.question,
        value: `remove_${index + 1}`
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_remove_question')
        .setPlaceholder('Choose a question to remove')
        .addOptions(options);

    const container = {
        type: 17,
        components: [
            {
                type: 10,
                content: "**Remove Question**\n\nSelect a question from the dropdown below to remove it immediately."
            },
            new ActionRowBuilder().addComponents(selectMenu),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cancel_remove')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            )
        ]
    };

    await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function showMoveQuestionInterface(interaction, questions, questionsKey, response) {

    const currentQuestions = await db.staff_app_questions.get(questionsKey) || [];

    const options = currentQuestions.map((q, index) => ({
        label: `Question ${index + 1}`,
        description: q.question.length > 50 ? q.question.substring(0, 47) + '...' : q.question,
        value: `move_${index + 1}`
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_move_question')
        .setPlaceholder('Choose a question to move')
        .addOptions(options);

    const container = {
        type: 17,
        components: [
            {
                type: 10,
                content: "**Move Question**\n\nSelect a question from the dropdown, then choose the direction to move it."
            },
            new ActionRowBuilder().addComponents(selectMenu),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cancel_move')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            )
        ]
    };

    await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleAddFlow(interaction, questionsKey, response) {
    if (interaction.customId === 'cancel_add') {
    await safeDefer(interaction);
    await refreshInterface(interaction, questionsKey, response);
        return;
    }

    const tempData = await db.staff_app_questions.get('temp_add') || {};
    const questionText = tempData[interaction.user.id];

    if (!questionText) {
        await interaction.reply({
            content: 'No question found. Please try again.',
            flags: 64
        });
        await refreshInterface(interaction, questionsKey, response);
        return;
    }

    const questions = await db.staff_app_questions.get(questionsKey) || [];
    questions.push({
        id: questions.length + 1,
        question: questionText
    });

    await db.staff_app_questions.set(questionsKey, questions);

    delete tempData[interaction.user.id];
    await db.staff_app_questions.set('temp_add', tempData);

    const guildName = interaction.guild.name;
    const guildId = interaction.guild.id;

    console.log(`[⭐] [MANAGE-STAFF-APPS-QUESTIONS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} added staff application question: ${questionText}`);

    await safeDefer(interaction);
    await refreshInterface(interaction, questionsKey, response);
}

async function handleRemoveFlow(interaction, questionsKey, response) {
    if (interaction.customId === 'cancel_remove') {
    await safeDefer(interaction);
    await refreshInterface(interaction, questionsKey, response);
        return;
    }
}

async function handleMoveFlow(interaction, questionsKey, response) {
    if (interaction.customId === 'cancel_move') {
    await safeDefer(interaction);
    await refreshInterface(interaction, questionsKey, response);
        return;
    }

    if (interaction.isStringSelectMenu()) {
        const selectedValue = interaction.values[0];
        const questionNumber = parseInt(selectedValue.split('_')[1]);

        const questions = await db.staff_app_questions.get(questionsKey) || [];
        const questionToMove = questions[questionNumber - 1];

        const container = {
            type: 17,
            components: [
                {
                    type: 10,
                    content: "**Move Question " + questionNumber + "**\n\n**Question:** " + questionToMove.question + "\n\nChoose the direction to move this question:"
                },
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`move_up_${questionNumber}`)
                        .setLabel('Move Up')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(questionNumber === 1),
                    new ButtonBuilder()
                        .setCustomId(`move_down_${questionNumber}`)
                        .setLabel('Move Down')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(questionNumber === questions.length),
                    new ButtonBuilder()
                        .setCustomId('cancel_move')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                )
            ]
        };

        await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    else if (interaction.customId.startsWith('move_up_') || interaction.customId.startsWith('move_down_')) {
        const questionNumber = parseInt(interaction.customId.split('_')[2]);
        const direction = interaction.customId.startsWith('move_up_') ? 'up' : 'down';

        const questions = await db.staff_app_questions.get(questionsKey) || [];
        const index = questionNumber - 1;
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= questions.length) {
            await interaction.reply({
                content: 'Cannot move question in that direction.',
                flags: 64
            });
            await refreshInterface(interaction, questionsKey, response);
            return;
        }

        [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]];

        questions.forEach((q, idx) => {
            q.id = idx + 1;
        });

        await db.staff_app_questions.set(questionsKey, questions);

        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;

        console.log(`[⭐] [MANAGE-STAFF-APPS-QUESTIONS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} moved question ${questionNumber} ${direction}`);

    await safeDefer(interaction);
    await refreshInterface(interaction, questionsKey, response);
    }
}

async function handleRemoveSelect(interaction, questionsKey, response) {
    const selectedValue = interaction.values[0];
    const questionNumber = parseInt(selectedValue.split('_')[1]);

    const questions = await db.staff_app_questions.get(questionsKey) || [];
    const removedQuestion = questions.splice(questionNumber - 1, 1)[0];

    questions.forEach((q, index) => {
        q.id = index + 1;
    });

    await db.staff_app_questions.set(questionsKey, questions);

    const guildName = interaction.guild.name;
    const guildId = interaction.guild.id;

    console.log(`[⭐] [MANAGE-STAFF-APPS-QUESTIONS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} removed staff application question: ${removedQuestion.question}`);

    await safeDefer(interaction);
    await refreshInterface(interaction, questionsKey, response);
}

async function handleMoveSelect(interaction, questionsKey, response) {
    const selectedValue = interaction.values[0];
    const questionNumber = parseInt(selectedValue.split('_')[1]);

    const questions = await db.staff_app_questions.get(questionsKey) || [];
    const questionToMove = questions[questionNumber - 1];

    const container = {
        type: 17,
        components: [
            {
                type: 10,
                content: "**Move Question " + questionNumber + "**\n\n**Question:** " + questionToMove.question + "\n\nChoose the direction to move this question:"
            },
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`move_up_${questionNumber}`)
                    .setLabel('Move Up')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(questionNumber === 1),
                new ButtonBuilder()
                    .setCustomId(`move_down_${questionNumber}`)
                    .setLabel('Move Down')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(questionNumber === questions.length),
                new ButtonBuilder()
                    .setCustomId('cancel_move')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            )
        ]
    };

    await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function refreshInterface(interaction, questionsKey, response) {
    const questions = await db.staff_app_questions.get(questionsKey) || [];
    const mainContainer = createMainInterface(questions);

    try {
        await response.edit({
            components: [mainContainer],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.error('Error refreshing interface:', error);
    }
}

async function stopInterface(interaction, questionsKey, response) {
    const questions = await db.staff_app_questions.get(questionsKey) || [];

    let questionsList = "**Staff Application Questions Manager - Final List**\n\n";

    if (questions.length === 0) {
        questionsList += "No questions set up.";
    } else {
        questions.forEach((q, index) => {
            questionsList += `**${index + 1}.** ${q.question}\n`;
        });
        questionsList += `\nTotal: ${questions.length} questions`;
    }

    const textDisplay = {
        type: 10,
        content: questionsList
    };

    const finalContainer = {
        type: 17,
        components: [textDisplay]
    };

    try {
        await interaction.update({
            components: [finalContainer],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.error('Error stopping interface:', error);

        try {
            await response.edit({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (_) {}
    }
}
