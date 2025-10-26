const cron = require('node-cron');
const db = require("./../../Handlers/database");

const time = "0 0 * * *"; // Daily at midnight UTC

async function runDailyBankInterest(client) {
    if (!client) {
        console.warn("[Bank Interest] Client not defined. Skipping run.");
        return;
    }

    console.log("[💰] [Bank Interest] Starting Bank Interest...");
    const bankEntries = await db.bank.all();

    // ✅ Prevent crash if db.bank.all() returns null/undefined
    if (!bankEntries || typeof bankEntries !== 'object' || Object.keys(bankEntries).length === 0) {
        console.warn("[Bank Interest] No bank data found or invalid data format.");
        return;
    }

    // ✅ Ensure guild is defined properly
    const guild = client.guilds.cache.first();
    if (!guild) {
        console.warn("[Bank Interest] No guild found in client cache.");
        return;
    }

    const guildKey = `${guild.name}_${guild.id}`;
    const Bankchannel = await db.settings.get(guildKey);

    for (const [key, entry] of Object.entries(bankEntries)) {
        if (!entry || typeof entry !== 'object' || entry.bank <= 0) continue;

        // Assuming key format: `${username}_${userId}`
        const underscoreIndex = key.lastIndexOf('_');
        if (underscoreIndex === -1) {
            console.warn(`[Bank Interest] Unexpected key format: ${key}`);
            continue;
        }

        const usernamePart = key.substring(0, underscoreIndex);
        const userIdPart = key.substring(underscoreIndex + 1);
        const safeUsername = usernamePart.replace(/\./g, '_');
        const safeKey = `${safeUsername}_${userIdPart}`;

        // Migrate data if key changed
        if (safeKey !== key) {
            console.log(`[Bank Interest] Migrating key ${key} to ${safeKey}`);
            await db.bank.set(safeKey, entry);
            await db.bank.delete(key);
        }

        const amount = entry.bank;
        const interest = Math.round(calculatePercent(amount, 1));
        const newBalance = amount + interest;

        const channel = Bankchannel?.bankchannel;
        if (channel) {
            const ch = guild.channels.cache.get(channel);
            if (ch) {
                ch.send(`- 💰 **[Bank Interest]** ${safeKey}: **Old Wallet:** \`${amount}\`, **Interest:** \`${interest}\`, **New Wallet:** \`${newBalance}\``);
            } else {
                console.warn(`[Bank Interest] Channel ID ${channel} not found in guild.`);
            }
        }

        console.log(`[💰] [Bank Interest] ${safeKey}: Old Wallet: ${amount}, Interest: ${interest}, New Wallet: ${newBalance}`);
        await db.bank.set(safeKey, { bank: newBalance });
    }
}

function calculatePercent(amount, percent) {
    return (percent / 100) * amount;
}

function startInterest(client) {
    cron.schedule(time, () => runDailyBankInterest(client), {
        scheduled: true,
        timezone: 'UTC'
    });
}

module.exports = async (client) => {
    if (!client) {
        console.warn("[Bank Interest] Client was not passed to module.exports.");
        return;
    }

    startInterest(client);
};
