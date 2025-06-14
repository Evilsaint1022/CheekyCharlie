const { Events, Message, Client, ButtonBuilder, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const OpenAI = require("openai");
const db = require("../../Handlers/database");

module.exports = {
    name: Events.MessageCreate,

    /**
     * @param {Message} message
     */
    async execute(message) {

        if ( message.author.bot || !message.guild ) { return; }

        const NsfwFilterEnabled = await db.settings.get(`${message.guild.name}_${message.guild.id}.nsfwFilter`);

        if ( !NsfwFilterEnabled ) {
            // NSFW filter is disabled, do nothing
            return;
        }

        const messageContent = message.content;
        const messageAttachments = message.attachments;
        const messageAttachmentURLs = messageAttachments.map(attachment => attachment.url);

        const openai = new OpenAI({ apiKey: "___", baseURL: "https://text.pollinations.ai/openai" })

        const userContent = [
            { 
                "type": "text", 
                "text": `Check if this message contains NSFW content: ${messageContent}` 
            }
        ];

        messageAttachmentURLs.forEach(url => {
            userContent.push({
                "type": "image_url",
                "image_url": { "url": url }
            });
        });

        const currentGoodChoices = await db.ai_nsfw_training.get(`${message.guild.name}_${message.guild.id}.goodChoices`) || [];
        const currentBadChoices = await db.ai_nsfw_training.get(`${message.guild.name}_${message.guild.id}.badChoices`) || [];

        const goodChoicesContent = currentGoodChoices.map(choice => choice.content).join("\n") || "No Good Choices";
        const badChoicesContent = currentBadChoices.map(choice => choice.content).join("\n") || "No Bad Choices";

        let systemPrompt = "You are a NSFW content filter. Your task is to determine if the provided text or image URLs contain NSFW content. DO NOT FILTER ANY SLURS ETC. ONLY NSFW CONTENT. If the content in the message or any image contian NSFW content, respond with 1. If the content is safe, respond with 0. Do not provide any additional information or explanations. ONLY RESPOND WITH THE NUMBER."

        if ( goodChoicesContent || goodChoicesAttachments || badChoicesContent || badChoicesAttachments ) {

            systemPrompt = "You are a NSFW content filter. Your task is to determine if the provided text or image URLs contain NSFW content. DO NOT FILTER ANY SLURS ETC. ONLY NSFW CONTENT. If the content in the message or any image contian NSFW content, respond with 1. If the content is safe, respond with 0. Do not provide any additional information or explanations. ONLY RESPOND WITH THE NUMBER.\n" + 
                        "Good choices are things you did well, bad choices are things you did wrong / werent necceseary. Things marked as Bad Choices should NOT BE REMOVED AGAIN. DO NOT REMOVE ANY THINS THAT ARE MARKED AS BAD CHOICES!!!!\n" + 
                        "Good choices: " + goodChoicesContent + "\n" +
                        "Bad choices: " + badChoicesContent + "\n"

        }

        try {
            const response = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        "role": "user",
                        "content": userContent
                    }
                ],
                model: "openai-fast",
                temperature: 0,
            });

            const nsfwCheckResult = response.choices[0].message.content.trim();

            if ( nsfwCheckResult === "1") {

                try {
                    await message.delete();
                } catch (error) {
                    
                }

                const nsfwLogsChannelId = await db.settings.get(`${message.guild.name}_${message.guild.id}.nsfwLogsChannel`);

                if ( nsfwLogsChannelId ) {

                    const nsfwLogsChannel = message.guild.channels.cache.get(nsfwLogsChannelId);

                    if ( nsfwLogsChannel && nsfwLogsChannel.isTextBased() && nsfwLogsChannel.isSendable() ) {

                        const nsfwContainer = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`**NSFW content detected.**\nBy ${message.author.username} (<@${message.author.id}>)\nIn (<#${message.channel.id}>)`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`||${messageContent}||`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent("Train the AI below.")
                        )
                        .addActionRowComponents(
                            new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("good-choice")
                                .setLabel("Good Choice")
                                .setStyle(ButtonStyle.Primary)
                            )
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("bad-choice")
                                .setLabel("Bad Choice")
                                .setStyle(ButtonStyle.Primary)
                            )
                        )

                        if ( messageAttachmentURLs.length > 0 ) {

                            nsfwContainer.addSeparatorComponents(
                                new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true)
                            );
                            nsfwContainer.addMediaGalleryComponents(
                                new MediaGalleryBuilder()
                                .addItems(
                                    messageAttachmentURLs.map(url => 
                                        new MediaGalleryItemBuilder()
                                        .setURL(url)
                                        .setSpoiler(true)
                                    )
                                )
                            );

                        }

                        const nsfwContainer_ButtonsDisabled = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`**NSFW content detected.**\nBy ${message.author.username} (<@${message.author.id}>)\nIn (<#${message.channel.id}>)`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`${messageContent}`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent("Train the AI below.")
                        )
                        .addActionRowComponents(
                            new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("good-choice")
                                .setLabel("Good Choice")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                            )
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("bad-choice")
                                .setLabel("Bad Choice")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                            )
                        )

                        if ( messageAttachmentURLs.length > 0 ) {

                            nsfwContainer_ButtonsDisabled.addSeparatorComponents(
                                new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true)
                            );
                            nsfwContainer_ButtonsDisabled.addMediaGalleryComponents(
                                new MediaGalleryBuilder()
                                .addItems(
                                    messageAttachmentURLs.map(url => 
                                        new MediaGalleryItemBuilder()
                                        .setURL(url)
                                        .setSpoiler(true)
                                    )
                                )
                            )

                        }

                        const nsfwContainerMessage = await nsfwLogsChannel.send({ components: [nsfwContainer], flags: [MessageFlags.IsComponentsV2] })
                        .catch(error => {console.log(error); return null;});

                        if (nsfwContainerMessage) {
                            console.log('Message sent successfully:', nsfwContainerMessage.id);
                        } else {
                            console.log('Message failed to send');
                        }

                        const collector = nsfwContainerMessage.createMessageComponentCollector({});

                        collector.on('collect', async (interaction) => {

                            if (interaction.customId === 'good-choice' || interaction.customId === 'bad-choice') {
                                await interaction.update({ components: [nsfwContainer_ButtonsDisabled] });
                                collector.stop();
                            }

                            if (  interaction.customId === 'good-choice' ) {

                                const currentGoodChoices = await db.ai_nsfw_training.get(`${message.guild.name}_${message.guild.id}.goodChoices`) || [];

                                currentGoodChoices.push({
                                    content: messageContent,
                                });

                                if ( currentGoodChoices.lenght > 100 ) {
                                    currentGoodChoices.shift();
                                }

                                await db.ai_nsfw_training.set(`${message.guild.name}_${message.guild.id}.goodChoices`, currentGoodChoices);

                            }

                            if (  interaction.customId === 'bad-choice' ) {

                                const currentBadChoices = await db.ai_nsfw_training.get(`${message.guild.name}_${message.guild.id}.badChoices`) || [];

                                currentBadChoices.push({
                                    content: messageContent,
                                });

                                if ( currentBadChoices.lenght > 100 ) {
                                    currentBadChoices.shift();
                                }

                                await db.ai_nsfw_training.set(`${message.guild.name}_${message.guild.id}.badChoices`, currentBadChoices);

                            }

                        });

                        collector.on('end', async () => {
                            try {
                                await nsfwContainerMessage.edit({ components: [nsfwContainer_ButtonsDisabled] });
                            } catch (error) {

                            }
                        });

                    }

                }

            }

            if (  nsfwCheckResult === "0") {
                // No NSFW content detected, log the safe message
                return;
            }

        } catch (error) {

            // NSFW content detected, because the request failed due to content restrictions
            if ( error.error == "400 Bad Request" ) {

                try {
                    await message.delete();
                } catch (error) {
                    
                }

                const nsfwLogsChannelId = await db.settings.get(`${message.guild.name}_${message.guild.id}.nsfwLogsChannel`);

                if ( nsfwLogsChannelId ) {

                    const nsfwLogsChannel = message.guild.channels.cache.get(nsfwLogsChannelId);

                    if ( nsfwLogsChannel && nsfwLogsChannel.isTextBased() && nsfwLogsChannel.isSendable() ) {

                        console.log(`NSFW Logs Channel: ${nsfwLogsChannel.name} (${nsfwLogsChannel.id})`);

                        const nsfwContainer = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`**NSFW content detected.**\nBy ${message.author.username} (<@${message.author.id}>)\nIn (<#${message.channel.id}>)`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`||${messageContent}||`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent("Train the AI below.")
                        )
                        .addActionRowComponents(
                            new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("good-choice")
                                .setLabel("Good Choice")
                                .setStyle(ButtonStyle.Primary)
                            )
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("bad-choice")
                                .setLabel("Bad Choice")
                                .setStyle(ButtonStyle.Primary)
                            )
                        )

                        if ( messageAttachmentURLs.length > 0 ) {

                            nsfwContainer.addSeparatorComponents(
                                new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true)
                            );
                            nsfwContainer.addMediaGalleryComponents(
                                new MediaGalleryBuilder()
                                .addItems(
                                    messageAttachmentURLs.map(url => 
                                        new MediaGalleryItemBuilder()
                                        .setURL(url)
                                        .setSpoiler(true)
                                    )
                                )
                            );

                        }

                        const nsfwContainer_ButtonsDisabled = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`**NSFW content detected.**\nBy ${message.author.username} (<@${message.author.id}>)\nIn (<#${message.channel.id}>)`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent(`${messageContent}`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                            .setContent("Train the AI below.")
                        )
                        .addActionRowComponents(
                            new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("good-choice")
                                .setLabel("Good Choice")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                            )
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId("bad-choice")
                                .setLabel("Bad Choice")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                            )
                        )

                        if ( messageAttachmentURLs.length > 0 ) {

                            nsfwContainer_ButtonsDisabled.addSeparatorComponents(
                                new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true)
                            );
                            nsfwContainer_ButtonsDisabled.addMediaGalleryComponents(
                                new MediaGalleryBuilder()
                                .addItems(
                                    messageAttachmentURLs.map(url => 
                                        new MediaGalleryItemBuilder()
                                        .setURL(url)
                                        .setSpoiler(true)
                                    )
                                )
                            )

                        }

                        const nsfwContainerMessage = await nsfwLogsChannel.send({ components: [nsfwContainer], flags: [MessageFlags.IsComponentsV2] })
                        .catch(error => {console.log(error); return null;});

                        if (nsfwContainerMessage) {
                            console.log('Message sent successfully:', nsfwContainerMessage.id);
                        } else {
                            console.log('Message failed to send');
                        }

                        const collector = nsfwContainerMessage.createMessageComponentCollector({});

                        collector.on('collect', async (interaction) => {

                            if (interaction.customId === 'good-choice' || interaction.customId === 'bad-choice') {
                                await interaction.update({ components: [nsfwContainer_ButtonsDisabled] });
                                collector.stop();
                            }

                            if (  interaction.customId === 'good-choice' ) {

                                const currentGoodChoices = await db.ai_nsfw_training.get(`${message.guild.name}_${message.guild.id}.goodChoices`) || [];

                                currentGoodChoices.push({
                                    content: messageContent,
                                });

                                if ( currentGoodChoices.lenght > 100 ) {
                                    currentGoodChoices.shift();
                                }

                                await db.ai_nsfw_training.set(`${message.guild.name}_${message.guild.id}.goodChoices`, currentGoodChoices);

                            }

                            if (  interaction.customId === 'bad-choice' ) {

                                const currentBadChoices = await db.ai_nsfw_training.get(`${message.guild.name}_${message.guild.id}.badChoices`) || [];

                                currentBadChoices.push({
                                    content: messageContent,
                                });

                                if ( currentBadChoices.lenght > 100 ) {
                                    currentBadChoices.shift();
                                }

                                await db.ai_nsfw_training.set(`${message.guild.name}_${message.guild.id}.badChoices`, currentBadChoices);

                            }

                        });

                        collector.on('end', async () => {
                            try {
                                await nsfwContainerMessage.edit({ components: [nsfwContainer_ButtonsDisabled] });
                            } catch (error) {

                            }
                        });

                    }

                }

            }

        }

    }
};
