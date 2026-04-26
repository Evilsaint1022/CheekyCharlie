const cron = require('node-cron');
const db = require("./../../Handlers/database");
const { EmbedBuilder } = require('discord.js');

// Daily Bank Interest Pacific/Auckland Correct Timer --> (DO NOT REMOVE!)
const time = '0 12 * * *'; // every day at 12:00 PM

// Testing Timer ( Keeping in for future use )
// const time = "*/10 * * * * *"; // Every 10 seconds

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

    const top =    `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const bottom = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const splitter = `**─────────────────────────────────**`;
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
        const settings = await db.settings.get(`${guild.id}`);
        const custom = await db.settings.get(`${guild.id}.currencyicon`);
        const ferns = await db.default.get("Default.ferns");

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

        let embedsToSend = [];
        let currentDescription = ``;

        for (const { username, amount, interest, newBalance } of interestResults) {
            const userBlock =
                `### 🌿・**__${username}__**\n${splitter}\n` +
                `- **__Old Bank__** ${custom || ferns}・\`${amount}\`\n` +
                `- **__Interest Gained__** ${custom || ferns}・\`${interest}\`\n` +
                `- **__New Balance__** ${custom || ferns}・\`${newBalance}\`\n${splitter}\n\n`;

            if (!currentDescription) currentDescription = top + "\n";

            if ((currentDescription + userBlock + bottom).length > 3500) {
                currentDescription += bottom;
                embedsToSend.push(currentDescription);
                currentDescription = top + "\n" + userBlock;
            } else {
                currentDescription += userBlock;
            }

            console.log(`[💰] [Bank Interest] ${username}: Old ${amount}, +${interest}, New ${newBalance}`);
        }

        if (currentDescription) {
            currentDescription += bottom;
            embedsToSend.push(currentDescription);
        }

        try {
            for (let i = 0; i < embedsToSend.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(0x207e37)
                    .setTitle(i === 0 ? `**💰・__Daily Bank Interest__**` : null)
                    .setDescription(embedsToSend[i])
                    .setFooter({ text: footer })
                    .setThumbnail(guild.iconURL());

                await channel.send({
                    embeds: [embed],
                    allowedMentions: { parse: [] }
                });
            }
        } catch (err) {
            console.warn(`[Bank Interest] Failed to send message in ${guild.name}:`, err.message);
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