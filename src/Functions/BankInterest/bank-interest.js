const cron = require('node-cron');
const db = require("./../../Handlers/database");

const time = "0 0 * * *"; // Daily at midnight UTC

async function runDailyBankInterest() {
    console.log("[💰] [Bank Interest] Starting Bank Interest...");
    const bankEntries = await db.bank.all();

    for (const [key, entry] of Object.entries(bankEntries)) {
        if (entry.bank <= 0) continue;

        // Assuming key format: `${username}_${userId}`
        const underscoreIndex = key.lastIndexOf('_');
        if (underscoreIndex === -1) {
            console.warn(`[Bank Interest] Unexpected key format: ${key}`);
            continue;
        }

        const usernamePart = key.substring(0, underscoreIndex);
        const userIdPart = key.substring(underscoreIndex + 1);

        // Replace dots with underscores in username part
        const safeUsername = usernamePart.replace(/\./g, '_');

        const safeKey = `${safeUsername}_${userIdPart}`;

        // If keys differ, migrate data to safeKey
        if (safeKey !== key) {
            console.log(`[Bank Interest] Migrating key ${key} to ${safeKey}`);
            await db.bank.set(safeKey, entry);
            await db.bank.delete(key);
        }

        const amount = entry.bank;
        const interest = Math.round(calculatePercent(amount, 1));
        const newBalance = amount + interest;

        console.log(`[💰] [Bank Interest] ${safeKey}: Old: ${amount}, Interest: ${interest}, New: ${newBalance}`);
        await db.bank.set(safeKey, { bank: newBalance });
    }
}

function calculatePercent(amount, percent) {
    return (percent / 100) * amount;
}

function startInterest() {
    cron.schedule(time, runDailyBankInterest, {
        scheduled: true,
        timezone: 'UTC'
    });
}

module.exports = async (client) => {
    startInterest();
};
