const cron = require('node-cron');
const db = require("../Handlers/database");

const time = "0 0 * * *"; // Daily at midnight UTC

async function runDailyBankInterest() {
    console.log("[💰] [Bank Interest] Starting Bank Interest...");
    const bankEntries = await db.bank.all();

    for (const [key, entry] of Object.entries(bankEntries)) {
        if (entry.bank <= 0) continue;

        console.log("FOR: " + key);

        const user = key;
        const amount = entry.bank;

        const interest = Math.round(calculatePercent(amount, 1));
        const newBalance = amount + interest;

        console.log(`[💰] [Bank Interest] ${user}: Old: ${amount}, Interest: ${interest}, New: ${newBalance}`);
        await db.bank.set(user, { bank: newBalance });
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

// Export a function to be called by the functionHandler
module.exports = async (client) => {
    startInterest();
};
