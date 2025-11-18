const cron = require('node-cron');
const db = require("./../../Handlers/database");
const { EmbedBuilder } = require('discord.js');

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
    const top =    `**─────────────────────────────────**`;
    const bottom = `**─────────────────────────────────**`;

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

        for (const [key, entry] of Object.entries(bankEntries)) {
            if (!entry || typeof entry !== 'object' || entry.bank <= 0) continue;

            let userId = key;
            if (key.includes("_")) {
                const underscoreIndex = key.lastIndexOf("_");
                userId = key.substring(underscoreIndex + 1);
            }

            const member = guild.members.cache.get(userId);
            const username = member?.user?.username ?? "Unknown User";

            const amount = entry.bank;
            const interest = Math.round((1 / 100) * amount);
            const newBalance = amount + interest;

            await db.bank.set(key, { bank: newBalance });

            const embed = new EmbedBuilder()
                .setColor(0x207e37)
                .setTitle(`💰・Daily Bank Interest for ${username}`)
                .setDescription(`${top}\n- **__Old Bank__** ${ferns} \`${amount}\`\n- **__Interest Gained__** ${ferns} \`${interest}\`\n- **__New Balance__** ${ferns} \`${newBalance}\`\n${bottom}`)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            try {
                await channel.send({
                    embeds: [embed],
                    allowedMentions: { parse: [] } // 🚫 NO PINGS ALLOWED
                });
            } catch (err) {
                console.warn(`[Bank Interest] Failed to send message in ${guild.name}:`, err.message);
            }

            console.log(`[💰] [Bank Interest] ${userId}: Old: ${amount}, Interest: ${interest}, New: ${newBalance}`);
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
