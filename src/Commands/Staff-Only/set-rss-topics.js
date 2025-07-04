const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType, TextDisplayBuilder, ContainerBuilder, SectionBuilder, ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize, messageLink } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../../Handlers/database');
const availableTopics = require("../../rssconfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-rss-topics')
        .setDescription('Set the topics for the RSS News Channel'),

    async execute(interaction) {
        
        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const rssNewsChannelId = await db.settings.get(`${guildName}_${guildId}.rssNewsChannel`);

        if ( !rssNewsChannelId ) {
            return interaction.reply({ content: 'RSS News Channel is not set. Please set it using the `/set-rss-channel` command.', flags: MessageFlags.Ephemeral });
        }

        const rssNewsChannel = interaction.guild.channels.cache.get(rssNewsChannelId);

        if (!rssNewsChannel || rssNewsChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'The RSS News Channel is not a valid text channel or does not exist anymore.', flags: MessageFlags.Ephemeral });
        }

        const topics = availableTopics;

        const currentTopics = await db.settings.get(`${guildName}_${guildId}.rssTopics`) || [];

        function createTopicsContainer(topics, currentTopics) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## Select RSS Topics.'));

            topics.forEach(topic => {
                const button = new ButtonBuilder();

                const isSelected = currentTopics.some(currentTopic => currentTopic.name === topic.name);
                if (isSelected) {
                    button.setLabel('-');
                    button.setStyle(ButtonStyle.Danger);
                    button.setCustomId(`toggle_${topic.name.toLowerCase()}_-`);
                } else {
                    button.setLabel('+');
                    button.setStyle(ButtonStyle.Success);
                    button.setCustomId(`toggle_${topic.name.toLowerCase()}_+`);
                }

                const section = new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${topic.name}`))
                    .setButtonAccessory(button);

                container.addSectionComponents(section);
            });

            return container;
        }

        const topicsContainer = createTopicsContainer(topics, currentTopics);
        topicsContainer.addSeparatorComponents( new SeparatorBuilder().setSpacing( SeparatorSpacingSize.Large ) );

        const saveButton = new ButtonBuilder()
            .setLabel('✅')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('save_rss_topics');

        const saveSection = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Done?'))
            .setButtonAccessory(saveButton);
        
        topicsContainer.addSectionComponents(saveSection);

        await interaction.reply({ components: [topicsContainer], flags: MessageFlags.IsComponentsV2 });

        const filter = i => i.customId.startsWith('toggle_') || i.customId === 'save_rss_topics';

        const collector = interaction.channel.createMessageComponentCollector({ filter });

        collector.on('collect', async i => {

            if (i.customId === 'save_rss_topics') {

                const resultContainer = new ContainerBuilder();
                resultContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('## Select RSS Topics.'));

                topics.forEach(topic => {
                    const button = new ButtonBuilder();

                    const isSelected = currentTopics.some(currentTopic => currentTopic.name === topic.name);
                    if (isSelected) {
                        button.setLabel('-');
                        button.setStyle(ButtonStyle.Danger);
                        button.setCustomId(`toggle_${topic.name.toLowerCase()}_-`);
                        button.setDisabled(true);
                    } else {
                        button.setLabel('+');
                        button.setStyle(ButtonStyle.Success);
                        button.setCustomId(`toggle_${topic.name.toLowerCase()}_+`);
                        button.setDisabled(true);
                    }

                    const section = new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${topic.name}`))
                        .setButtonAccessory(button);

                    resultContainer.addSectionComponents(section);
                });

                resultContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
                resultContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('RSS topics updated successfully.'));

                collector.stop();

                if ( currentTopics.length === 0 ) {

                    await db.settings.set(`${guildName}_${guildId}.rssTopics`, []);
                    
                } else {

                    await db.settings.set(`${guildName}_${guildId}.rssTopics`, currentTopics);

                }

                return i.update({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 });
            }

            const topic = i.customId.split('_')[1];
            const action = i.customId.split('_')[2];

            if (action === '+') {
                currentTopics.push({ name: topic.charAt(0).toUpperCase() + topic.slice(1), url: topics.find(t => t.name.toLowerCase() === topic).url });
            } else if (action === '-') {
                const index = currentTopics.findIndex(t => t.name.toLowerCase() === topic);
                if (index > -1) {
                    currentTopics.splice(index, 1);
                }
            }

            const updatedContainer = createTopicsContainer(topics, currentTopics);
            updatedContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

            const saveButton = new ButtonBuilder()
                .setLabel('✅')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('save_rss_topics');

            const saveSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Done?'))
                .setButtonAccessory(saveButton);

            updatedContainer.addSectionComponents(saveSection);

            await i.update({ components: [updatedContainer], flags: MessageFlags.IsComponentsV2 });

        });

    },
};
