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

    console.log(`[���] [Bank Interest] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] Starting Bank Interest...`);

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

    const ferns = '<:Ferns:1395219665638391818>';
    const top =    `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const bottom = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const splitter = `**─────────────────────────────────**`;
    const footer = `🌿・Thanks for using Bank-NZ`;

    for (const guild of client.guilds.cache.values()) {
        const guildKey = `${guild.id}`;
        const settings = await db.settings.get(guildKey);

        if (!settings || !settings.bankinterest) continue;

        let channel = guild.channels.cache.get(settings.bankinterest);
        if (!channel) {
            channel = await guild.channels.fetch(settings.bankinterest).catch(() => null);
            console.warn(`[Bank Interest] Channel ID ${settings.bankinterest} not found in guild ${guild.name}`);
            continue;
        }

        let embedsToSend = [];
        let currentDescription = ``;
        let hasUsers = false;

        for (const [userId, entry] of Object.entries(bankEntries)) {
            if (!entry || typeof entry !== "object" || entry.bank <= 0) continue;

            hasUsers = true;

            let username = "Unknown User";
            try {
                const user = await client.users.fetch(userId);
                username = user.username;
            } catch {}

            const amount = entry.bank;
            const interest = Math.round((1 / 100) * amount);
            const newBalance = amount + interest;

            await db.bank.set(userId, { bank: newBalance });

            const userBlock =
                `### 🌿・**__${username}__**\n${splitter}\n` +
                `- **__Old Bank__** ${ferns}・\`${amount}\`\n` +
                `- **__Interest Gained__** ${ferns}・\`${interest}\`\n` +
                `- **__New Balance__** ${ferns}・\`${newBalance}\`\n${splitter}\n\n`;

            // ✅ Ensure embed starts cleanly with top
            if (!currentDescription) currentDescription = top + "\n";

            // ✅ Split if exceeding limit
            if ((currentDescription + userBlock + bottom).length > 3500) {
                currentDescription += bottom;
                embedsToSend.push(currentDescription);

                // Start new embed
                currentDescription = top + "\n" + userBlock;
            } else {
                currentDescription += userBlock;
            }

            console.log(`[💰] [Bank Interest] ${username}: Old ${amount}, +${interest}, New ${newBalance}`);
        }

        if (!hasUsers) continue;

        // ✅ Push final embed chunk
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