const cron = require('node-cron');
const db = require("../../Handlers/database");
const { Client, MessageFlags } = require("discord.js");
const OpenAI = require("openai");

const time = "* * * * * *";

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

            const deadchatSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

            const durationMs = Number(deadchatSettings.deadchatDuration);
            const roleId = deadchatSettings.deadchatRoleId;
            const channelId = deadchatSettings.deadchatChannelId;
            const deadchatState = deadchatSettings.deadchatState || false;

            if ( !durationMs || !roleId || !channelId ) continue;

            const role = await guild.roles.fetch(roleId);

            if ( !role ) continue;

            const lastDeadchatId = await db.ai_deadchat.get(`${guildName}_${guildId}.lastDeadchatMessage`) || "";
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

                    "You are a Kiwi AI. Chat is dead. Ask a funny NZ question.",
                    "You are a Hobbit-inspired AI. Chat is quiet. Ask a LOTR-themed question.",
                    "You are a cheeky Kiwi AI. Chat is stalled. Start a NZ debate.",
                    "You are an NZ culture bot. Chat is flat. Ask a weird Kiwi scenario.",
                    "You are a rugby AI. Chat is quiet. Drop a funny rugby question.",
                    "You are a Kiwi foodie AI. Chat is dead. Ask a silly pie or pavlova debate.",
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

                await db.ai_deadchat.set(`${guildName}_${guildId}.lastDeadchatMessage`, deadchatMessage.id);

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

    scheduledTask = cron.schedule(time, () => checkAIDeadchat(client), {
        scheduled: true,
        timezone: 'UTC'
    });

    isScheduled = true;
}

module.exports = startDeadchat;
