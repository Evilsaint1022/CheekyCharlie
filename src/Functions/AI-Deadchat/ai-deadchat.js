const cron = require('node-cron');
const db = require("../../Handlers/database");
const { Client, MessageFlags } = require("discord.js");
const OpenAI = require("openai");

const time = "0 */5 * * * *";

let isRunning = false;
let isScheduled = false;
let scheduledTask = null;

const GuildTimeoutMap = new Map();

const openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });

/**
 * @param {Client} client
 */

async function checkAIDeadchat(client) {

    if (client.shard && client.shard.id !== 0) {
        return;
    }

    if (isRunning) {
        return;
    }

    isRunning = true;

    try {
        const clientGuilds = await client.guilds.cache.map(guild => (guild));

        for (const guild of clientGuilds) {

            const guildName = guild.name;
            const guildId = guild.id;

            const deadchatSettings = await db.settings.get(`${guildId}`) || {};

            const durationMs = Number(deadchatSettings.deadchatDuration);
            const roleId = deadchatSettings.deadchatRoleId;
            const channelId = deadchatSettings.deadchatChannelId;
            const deadchatState = deadchatSettings.deadchatState || false;

            if ( !durationMs || !roleId || !channelId ) continue;

            const role = await guild.roles.fetch(roleId);

            if ( !role ) continue;

            const lastDeadchatId = await db.ai_deadchat.get(`${guildId}.lastDeadchatMessage`) || "";
            const channel = await client.channels.fetch(channelId);

            if ( !channel ) continue;

            if ( !deadchatState ) continue;

            const messages = await channel.messages.fetch({ limit: 2 });
            const sortedMessages = Array.from(messages.values()).sort((a, b) => b.createdTimestamp - a.createdTimestamp);

            if ( !sortedMessages || !sortedMessages[0] ) continue;

            const lastMessageId = sortedMessages[0].id;

            if ( lastDeadchatId == lastMessageId ) { continue; }

            if (sortedMessages[0].author.id === client.user.id) continue;

            if (GuildTimeoutMap.has(guildId)) continue;

            const timeout = setTimeout(async () => {

                const prompts = [
                "You are a Kiwi. The chat is dead. Ask a random New Zealand related question.",
                "You are a Kiwi. The chat is quiet. Ask something about classic Kiwi food.",
                "You are a Kiwi. The chat is silent. Ask a question about iconic NZ places.",
                "You are a Kiwi. The chat is dead. Ask something about Kiwi slang.",
                "You are a Kiwi. The chat is quiet. Ask about favourite Kiwi childhood snacks.",
                "You are a Kiwi. The chat is silent. Ask which NZ beach is the best.",
                "You are a Kiwi. The chat is dead. Ask about classic Kiwi summer traditions.",
                "You are a Kiwi. The chat is quiet. Ask about the best fish and chips spot in NZ.",
                "You are a Kiwi. The chat is silent. Ask what everyone’s go-to pie flavour is.",
                "You are a Kiwi. The chat is dead. Ask about road trips around NZ.",
                "You are a Kiwi. The chat is quiet. Ask about their favourite NZ lolly.",
                "You are a Kiwi. The chat is silent. Ask about the most Kiwi thing they’ve ever done.",
                "You are a Kiwi. The chat is dead. Ask which NZ town has the best vibe.",
                "You are a Kiwi. The chat is quiet. Ask which Kiwi bird they’d be and why.",
                "You are a Kiwi. The chat is silent. Ask who’s had L&P recently.",
                "You are a Kiwi. The chat is dead. Ask who can name the most Kiwi slang words.",
                "You are a Kiwi. The chat is quiet. Ask if pineapple lumps are elite or overrated.",
                "You are a Kiwi. The chat is silent. Ask about favourite NZ road trip songs.",
                "You are a Kiwi. The chat is dead. Ask what their favourite Kiwi TV show is.",
                "You are a Kiwi. The chat is quiet. Ask what they’d name a pet tuatara."
                ];

                
                const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

                const finalPrompt = randomPrompt + " Reply ONLY with the question / topic etc."
                
                const response = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: finalPrompt },
                    ],
                    model: "meta-llama/llama-4-maverick-17b-128e-instruct",
                    temperature: 0.7,
                });

                const reply = response.choices[0].message.content;

                const deadchatMessage = await channel.send({ 
                    content: `**The chat is dead!** — <@&${role.id}>\n` + reply.trim(),
                    allowedMentions: { roles: [role.id] }
                });

                await db.ai_deadchat.set(`${guildId}.lastDeadchatMessage`, deadchatMessage.id);

                GuildTimeoutMap.delete(guildId);
                
            }, durationMs);

            GuildTimeoutMap.set(guildId, timeout);

        }

    } finally {
        isRunning = false;
    }

}

function messageHandler(message) {

    try {
        if ( !message || !message.guild || !message.guild.id ) return;

        const guildId = message?.guild?.id;
        if (GuildTimeoutMap.has(guildId)) {
            clearTimeout(GuildTimeoutMap.get(guildId));
            GuildTimeoutMap.delete(guildId);
        }
    } catch (e) {
        return;
    }
    
}

function startDeadchat(client) {

    if (isScheduled) {
        console.log('[💭] [AI Deadchat] Already scheduled, skipping start.');
        return;
    }

    client.on('messageCreate', messageHandler);

    scheduledTask = cron.schedule(time, () => {
        (async () => {
            try {
                await checkAIDeadchat(client);
            } catch (err) {
                console.error('[💭] [AI Deadchat] Error in scheduled task: ', err);
            }
        })();
    }, {
        scheduled: true,
        timezone: 'UTC'
    });

    isScheduled = true;
}

module.exports = startDeadchat;
