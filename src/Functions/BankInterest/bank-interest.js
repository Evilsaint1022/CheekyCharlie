const cron = require('node-cron');
const db = require("./../../Handlers/database");
const { EmbedBuilder } = require('discord.js');

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// Testing Timer ( Keeping in for future use )
// const time = "*/60 * * * * *"; // Every 60 seconds
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

// Daily Bank Interest Pacific/Auckland Correct Timer --> (DO NOT REMOVE!)
const time = '0 12 * * *'; // every day at 12:00 PM

async function runDailyBankInterest(client) {
    if (!client) {
        console.warn("[Bank Interest] Client not defined. Skipping run.");
        return;
    }

    if (runDailyBankInterest._isRunning) {
        console.log('[💰] [Bank Interest] is already Running... skipping this tick.');
        return;
    }

    runDailyBankInterest._isRunning = true;

    try {

    console.log(`[💰] [Bank Interest] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] Starting Bank Interest...`);

    const rawEntries = await db.bank.all();
    if (!rawEntries || typeof rawEntries !== "object") {
        console.warn("[Bank Interest] No bank data found.");
        return;
    }

    const migratedEntries = {};

    for (const [key, entry] of Object.entries(rawEntries)) {
        if (!entry || typeof entry !== "object") continue;

        let userId = key;

        if (key.includes("_")) {
            const underscoreIndex = key.lastIndexOf("_");
            const extracted = key.substring(underscoreIndex + 1);
            if (!isNaN(extracted)) userId = extracted;
        }

        if (userId !== key) {
            console.log(`[MIGRATION] Converting key "${key}" → "${userId}"`);
            await db.bank.set(userId, entry);
            await db.bank.delete(key);
        }

        migratedEntries[userId] = entry;
    }

    const bankEntries = migratedEntries;

    const top =    `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·\n\n`;
    const bottom = `\n· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const splitter = `***─────────────────────────────────***\n`;
    const footer = `🌿・Thanks for using Bank-NZ`;

    // Apply interest once to all users and collect results
    const interestResults = [];

    for (const [userId, entry] of Object.entries(bankEntries)) {
        if (!entry || typeof entry !== "object" || entry.bank <= 0) continue;

        let username = "Unknown User";
        try {
            const user = await client.users.fetch(userId);
            username = user.username;
        } catch {}

        const amount = entry.bank;
        const interest = Math.round((1 / 100) * amount);
        const newBalance = amount + interest;

        await db.bank.set(userId, { bank: newBalance });
        interestResults.push({ userId, username, amount, interest, newBalance });
    }

    if (interestResults.length === 0) return;

    // Per-guild: send to channel if configured, otherwise just log
    for (const guild of client.guilds.cache.values()) {
        const settings = await db.settings.get(`${guild.id}`) || {};
        const custom = await db.settings.get(`${guild.id}.currencyicon`);
        const ferns = await db.default.get("Default.ferns");

        const existingMessage = settings.bankinterestmessageid;

        const hasChannel = settings && settings.bankinterest;
        let channel = null;

        if (hasChannel) {
            channel = guild.channels.cache.get(settings.bankinterest)
                || await guild.channels.fetch(settings.bankinterest).catch(() => null);

            if (!channel) {
                console.warn(`[Bank Interest] Channel ID ${settings.bankinterest} not found in guild ${guild.name}, running silently.`);
            }
        }

        if (!channel) {
            console.log(`[💰] [Bank Interest] [${guild.name}] Applied interest to ${interestResults.length} user(s) (no log channel configured).`);
            continue;
        }
        const nztimestamp = `\n***[ \`${new Date().toLocaleDateString('en-GB')} - ${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}\` ]***\n`
        let embedsToSend = [];
        let currentDescription = `***Thanks for using The Bank System ❤️***\n${splitter}`;

        for (const { username, amount, interest, newBalance } of interestResults) {

            const userBlock =
                `🌿***${username}:***ㅤ ㅤ***${custom || ferns} \`${amount}\`*** ***+\`${interest}\`*** ***${custom || ferns} \`${newBalance}\`***\n`;

            if (!currentDescription) currentDescription = splitter + "";

            if ((currentDescription + userBlock).length > 3600) {
                currentDescription += nztimestamp;
                embedsToSend.push(currentDescription);
                currentDescription = splitter + "" + userBlock;
            } else {
                currentDescription += userBlock;
            }

            console.log(`[💰] [Bank Interest] ${username}: Old ${amount}, +${interest}, New ${newBalance}`);
        }

        if (currentDescription) {
            currentDescription += nztimestamp;
            embedsToSend.push(currentDescription);
        }

        if (existingMessage) {

        const message = channel.messages.cache.get(existingMessage)
            || await channel.messages.fetch(existingMessage).catch(() => null);


        if (message) {

            for (let i = 0; i < embedsToSend.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(0x207e37)
                    .setTitle(i === 0 ? `***💰 \`Daily Bank Interest\`***` : null)
                    .setDescription(embedsToSend[i])
                    .setThumbnail(guild.iconURL());

                await message.edit({
                    embeds: [embed],
                    allowedMentions: { parse: [] }
                });
            }
        }
            } else {

        try {
            for (let i = 0; i < embedsToSend.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(0x207e37)
                    .setTitle(i === 0 ? `***💰 \`Daily Bank Interest\`***` : null)
                    .setDescription(embedsToSend[i])
                    .setThumbnail(guild.iconURL());

                let message = await channel.send({
                    embeds: [embed],
                    allowedMentions: { parse: [] }
                })

                await db.settings.set(`${guild.id}.bankinterestmessageid`, message.id);
            }
                } catch (err) {
                    console.warn(`[Bank Interest] Failed to send message in ${guild.name}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('[💰] [Bank Interest] Unhandled error:', err);
    } finally {
        runDailyBankInterest._isRunning = false;
    }
}

function startInterest(client) {
    cron.schedule(time, () => runDailyBankInterest(client), {
        scheduled: true,
        timezone: 'Pacific/Auckland'
    });
}

module.exports = async (client) => {
    if (!client) {
        console.warn("[Bank Interest] Client was not passed to module.exports.");
        return;
    }

    startInterest(client);
};