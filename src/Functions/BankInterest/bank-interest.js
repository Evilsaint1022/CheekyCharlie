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

        // ✅ Await the settings fetch
        const settings = await db.settings.get(guildKey);

        if (!settings || !settings.bankchannel) {
            console.warn(`[Bank Interest] No bankchannel found for guild: ${guild.name}`);
            continue;
        }

        const channelId = settings.bankchannel;
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
            console.warn(`[Bank Interest] Channel ID ${channelId} not found in guild ${guild.name}`);
            continue;
        }

        // ✅ Process each bank entry
        for (const [key, entry] of Object.entries(bankEntries)) {
            if (!entry || typeof entry !== 'object' || entry.bank <= 0) continue;

            const underscoreIndex = key.lastIndexOf('_');
            if (underscoreIndex === -1) {
                console.warn(`[Bank Interest] Unexpected key format: ${key}`);
                continue;
            }

            const usernamePart = key.substring(0, underscoreIndex);
            const userIdPart = key.substring(underscoreIndex + 1);
            const safeUsername = usernamePart.replace(/\./g, '_');
            const safeKey = `${safeUsername}_${userIdPart}`;

            if (safeKey !== key) {
                console.log(`[Bank Interest] Migrating key ${key} to ${safeKey}`);
                await db.bank.set(safeKey, entry);
                await db.bank.delete(key);
            }

            const amount = entry.bank;
            const interest = Math.round(calculatePercent(amount, 1)); // 1%
            const newBalance = amount + interest;

            await db.bank.set(safeKey, { bank: newBalance });

            try {
                await channel.send(
                    `- 💰 **[Bank Interest]** ${safeKey}: **Old Wallet:** ${ferns} \`${amount}\`, **Interest:** ${ferns} \`${interest}\`, **New Wallet:** ${ferns} \`${newBalance}\``
                );
            } catch (err) {
                console.warn(`[Bank Interest] Failed to send message in ${guild.name}:`, err.message);
            }

            console.log(`[💰] [Bank Interest] ${safeKey}: Old Wallet: ${amount}, Interest: ${interest}, New Wallet: ${newBalance}`);
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
