
const cron = require('node-cron');
const db = require("./Handlers/database");

const time = "0 0 * * *"; // Daily at midnight UTC
async function runDailyBankInterest() {
    console.log('Running daily bank interest calculation...');

    const bankEntries = await db.bank.all();
    for (const [key, entry] of Object.entries(bankEntries)) {
        if (entry.bank <= 0) {
            continue;
        }

        console.log("FOR: " + key);

        const user = key;
        const amount = entry.bank;

        const interest = Math.round(calcutelatePercent(amount, 1));
        const newBalance = amount + interest;

        console.log(`Old: ${amount}, Interest: ${interest}, New: ${newBalance}`);
        await db.bank.set(user, { bank: newBalance });
    }
}

function calcutelatePercent(amount, percent) {
    return (percent / 100) * amount;
}

function startInterest() {

    console.log("Started daily bank interest calculation.");

    cron.schedule(time, runDailyBankInterest, {
        scheduled: true,
        timezone: 'UTC'
    });

}

module.exports = { startInterest };
