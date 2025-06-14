const { Events, Message, Client } = require("discord.js");
const OpenAI = require("openai");
const db = require("../../Handlers/database");

module.exports = {
    name: Events.MessageCreate,

    /**
     * @param {Message} message
     */
    async execute(message) {

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

        try {
            const response = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a NSFW content filter. Your task is to determine if the provided text or image URLs contain NSFW content. DO NOT FILTER ANY SLURS ETC. ONLY NSFW CONTENT. If the content in the message or any image contian NSFW content, respond with 1. If the content is safe, respond with 0. Do not provide any additional information or explanations. ONLY RESPOND WITH THE NUMBER",
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
                // NSFW content detected, delete the message
                await message.delete();
                return;
            }

            if (  nsfwCheckResult === "0") {
                // No NSFW content detected, log the safe message
                return;
            }

        } catch (error) {

            // NSFW content detected, because the request failed due to content restrictions
            if ( error.error == "400 Bad Request" ) {

                await message.delete();
                return;

            }

        }

    }
};
