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

    if (!bankEntries || typeof bankEntries !== 'object' || Object.keys(bankEntries).length === 0) {
        console.warn("[Bank Interest] No bank data found or invalid data format.");
        return;
    }

    const ferns = '<:Ferns:1395219665638391818>';

    for (const guild of client.guilds.cache.values()) {
        const guildKey = `${guild.name}_${guild.id}`;
        const settings = await db.settings.get(guildKey);

        if (!settings || !settings.bankchannel) {
            console.warn(`[Bank Interest] No bankchannel found for guild: ${guild.name}`);
            continue;
        }

        const channel = guild.channels.cache.get(settings.bankchannel);
        if (!channel) {
            console.warn(`[Bank Interest] Channel ID ${settings.bankchannel} not found in guild ${guild.name}`);
            continue;
        }

        // ---------------------------------------
        // 🔥 Process each bank entry using only IDs
        // ---------------------------------------
        for (const [key, entry] of Object.entries(bankEntries)) {

            if (!entry || typeof entry !== 'object' || entry.bank <= 0) continue;

            // Extract ID (ignore username part)
            // key format example: evilsaint1022_1032169288984961056
            let userId = key;

            if (key.includes("_")) {
                const underscoreIndex = key.lastIndexOf("_");
                userId = key.substring(underscoreIndex + 1);
            }

            // Calculate interest
            const amount = entry.bank;
            const interest = Math.round(calculatePercent(amount, 1)); // 1%
            const newBalance = amount + interest;

            // Save new balance using ORIGINAL key, not userId
            await db.bank.set(key, { bank: newBalance });

            // Send Discord message
            try {
                await channel.send(
                    `- **[ 💰__Bank Interest__ ]** <@${userId}>:\n> **Old Bank:** ${ferns} \`${amount}\`\n> **Interest:** ${ferns} \`${interest}\`\n> **New Bank:** ${ferns} \`${newBalance}\``
                );
            } catch (err) {
                console.warn(`[Bank Interest] Failed to send message in ${guild.name}:`, err.message);
            }

            console.log(`[💰] [Bank Interest] ${userId}: Old: ${amount}, Interest: ${interest}, New: ${newBalance}`);
        }
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
