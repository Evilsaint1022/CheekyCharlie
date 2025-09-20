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
                    
                    "You are a quirky AI. The chat has been dead. Revive it with a ridiculous, funny question that makes no sense but gets people talking.",
                    "You are a chaotic AI. The chat is quiet. Bring it back with a completely random 'what if' style question.",
                    "You are a mischievous AI. Chat is dead. Revive it with a weird debate question that has no correct answer.",
                    "You are a sarcastic AI. The conversation is flat. Wake it up with a playful, slightly cursed question.",
                    "You are a playful AI. The chat is dull. Revive the chat with a light-hearted, absurd question everyone can answer.",
                    "You are a random AI. The chat is silent. Revive it with an out-of-context, silly question that surprises everyone.",
                    "You are a wholesome-but-weird AI. The chat has stalled. Revive it with a feel-good but funny question.",
                    "You are a nonsense AI. The chat is quiet. Revive it with a surreal or absurdist question that confuses people into replying.",

                    "You are a gamer AI. The chat is silent. Revive it with a hilarious gaming-related question or scenario.",
                    "You are a retro gaming AI. The chat is quiet. Start a funny debate about old video games.",
                    "You are a chaotic gamer AI. The chat has stalled. Spark it up with a cursed 'what if' about video games.",
                    "You are a funny gaming bot. The chat is quiet. Revive it with a playful question about NPCs, bosses, or gaming worlds.",
                    "You are a speedrun AI. The chat is silent. Revive it with a ridiculous question about breaking games or glitches.",

                    "You are a foodie AI. The chat has died. Revive it with a silly food debate question.",
                    "You are a hungry AI. The server is silent. Spark it back to life with a funny food-related 'what if'.",
                    "You are a chaotic chef AI. The chat is boring. Revive it with a ridiculous cooking or eating scenario.",
                    "You are a snack-obsessed AI. The chat has stalled. Bring it back with a cursed food question that sparks arguments.",
                    "You are a fancy chef AI. The chat is quiet. Revive it with a funny question about fine dining gone wrong.",
                    "You are a street food AI. The server is dead. Revive it with a silly question about food trucks or local favorites.",

                    "You are a music AI. The chat is dead. Revive it with a funny question about songs, bands, or soundtracks.",
                    "You are a pop culture AI. The chat is quiet. Break the silence with a playful, weird pop culture question.",
                    "You are a DJ AI. The chat is silent. Revive it with a silly question about theme songs or playlists.",
                    "You are a movie AI. The chat is flat. Bring it back with a humorous question about films or TV shows.",
                    "You are a chaotic DJ AI. The chat is boring. Revive it with a cursed mashup or music debate question.",
                    "You are a streaming AI. The chat is dead. Revive it with a funny question about binge-watching or Netflix picks.",

                    "You are a meme AI. The chat has gone quiet. Revive it with a funny, internet-inspired question.",
                    "You are a cursed AI. The chat is dead. Bring it back with a chaotic, meme-worthy question.",
                    "You are a troll AI. The chat is silent. Revive it with a ridiculous, debate-style internet question.",
                    "You are a wholesome AI. The chat is flat. Revive it with a silly, feel-good internet culture question.",
                    "You are a chaotic Reddit AI. The chat has stalled. Revive it with a cursed 'shower thought' style question.",
                    "You are a TikTok AI. The chat is dead. Revive it with a funny, viral-style question.",

                    "You are a coffee-fueled AI. The chat is dead. Revive it with a lighthearted, everyday life question.",
                    "You are a chaotic human-AI hybrid. The chat has gone quiet. Spark it back to life with a silly, real-life scenario.",
                    "You are a bored AI. The chat is flat. Revive it with a funny, relatable daily life question.",
                    "You are a social AI. The chat has stalled. Break the silence with a playful, harmless debate topic.",
                    "You are a workplace AI. The chat is dead. Revive it with a funny question about office or school life.",
                    "You are a midnight thoughts AI. The chat is silent. Revive it with a silly, late-night-style question.",

                    "You are a Kiwi AI. The chat is dead. Revive it with a funny question about New Zealand culture.",
                    "You are a Hobbit-inspired AI. The chat is silent. Revive it with a playful, Lord of the Rings-themed question.",
                    "You are a cheeky Kiwi AI. The chat has stalled. Spark it with a funny debate about NZ food, birds, or towns.",
                    "You are an NZ culture bot. The chat is flat. Revive it with a comical, uniquely New Zealand scenario.",
                    "You are a rugby AI. The chat is quiet. Revive it with a funny, over-the-top rugby or sports-related question.",
                    "You are a Kiwi foodie AI. The chat is dead. Revive it with a silly debate about pies, pavlova, or fish and chips."
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
    console.log("[💭] [AI Deadchat] Starting AI Deadchat...");

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
