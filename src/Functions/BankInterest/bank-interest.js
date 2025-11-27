const cron = require('node-cron');
const db = require("./../../Handlers/database");
const { EmbedBuilder } = require('discord.js');

// Daily at midnight UTC Correct Timer ( DO NOT REMOVE! )
const time = "0 0 * * *";

// Testing Timer ( Keeping in for future use )
// const time = "*/10 * * * * *"; // Every 10 seconds



async function runDailyBankInterest(client) {
    if (!client) {
        console.warn("[Bank Interest] Client not defined. Skipping run.");
        return;
    }

    console.log(`[💰] [Bank Interest] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] Starting Bank Interest...`);

    // =============================
    // 🔧 DATABASE MIGRATION SECTION
    // =============================
    const rawEntries = await db.bank.all();
    if (!rawEntries || typeof rawEntries !== "object") {
        console.warn("[Bank Interest] No bank data found.");
        return;
    }

    const migratedEntries = {};

    for (const [key, entry] of Object.entries(rawEntries)) {
        if (!entry || typeof entry !== "object") continue;

        let userId = key;

        // --- Detect old format: username_userid / safeusername_userid ---
        if (key.includes("_")) {
            const underscoreIndex = key.lastIndexOf("_");
            const extracted = key.substring(underscoreIndex + 1);

            if (!isNaN(extracted)) userId = extracted;
        }

        // --- MIGRATE if key != userId ---
        if (userId !== key) {
            console.log(`[MIGRATION] Converting key "${key}" → "${userId}"`);

            // Save migrated data
            await db.bank.set(userId, entry);

            // Remove old key
            await db.bank.delete(key);
        }

        migratedEntries[userId] = entry;
    }

    // From here on, ONLY userId keys exist.
    const bankEntries = migratedEntries;

    // ============
    // 💰 Interest
    // ============
    const ferns = '<:Ferns:1395219665638391818>';
    const top =    `**─────────────────────────────────**`;
    const bottom = `**─────────────────────────────────**`;

    for (const guild of client.guilds.cache.values()) {
        const guildKey = `${guild.name}_${guild.id}`;
        const settings = await db.settings.get(guildKey);

        if (!settings || !settings.bankinterest) {
            continue;
        }

        const channel = guild.channels.cache.get(settings.bankinterest);
        if (!channel) {
            console.warn(`[Bank Interest] Channel ID ${settings.bankinterest} not found in guild ${guild.name}`);
            continue;
        }

        // Loop through migrated entries
        for (const [userId, entry] of Object.entries(bankEntries)) {
            if (!entry || typeof entry !== "object" || entry.bank <= 0) continue;

            // Try to fetch the member (for avatar)
            let member = guild.members.cache.get(userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(userId);
                } catch { member = null; }
            }

            // Fetch username directly from user ID
            let username = "Unknown User";
            try {
                const user = await client.users.fetch(userId);
                username = user.username;
                avatar = user.displayAvatarURL();
            } catch {}

            const amount = entry.bank;
            const interest = Math.round((1 / 100) * amount);
            const newBalance = amount + interest;

            // Save updated amount using CLEAN userId key
            await db.bank.set(userId, { bank: newBalance });

            const embed = new EmbedBuilder()
                .setColor(0x207e37)
                .setTitle(`💰・Bank Interest for ${username}`)
                .setDescription(
                    `${top}\n` +
                    `- **__Old Bank__** ${ferns} \`${amount}\`\n` +
                    `- **__Interest Gained__** ${ferns} \`${interest}\`\n` +
                    `- **__New Balance__** ${ferns} \`${newBalance}\`\n` +
                    `${bottom}`
                )
                .setThumbnail(avatar || member.displayAvatarURL())
                .setTimestamp();

            try {
                await channel.send({
                    embeds: [embed],
                    allowedMentions: { parse: [] } // 🚫 NO PINGS
                });
            } catch (err) {
                console.warn(`[Bank Interest] Failed to send message in ${guild.name}:`, err.message);
            }

            console.log(`[💰] [Bank Interest] ${username}: Old ${amount}, +${interest}, New ${newBalance}`);
        }
    }
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
