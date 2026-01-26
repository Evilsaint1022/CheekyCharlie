// beg.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

const begCooldown = 10 * 1000; // 10 seconds
const MIN_REWARD = 1;
const MAX_REWARD = 15;

const begPhrases = [
    "A kind stranger tosses you",
    "Someone takes pity on you and gives",
    "A traveler drops a few Ferns at your feet",
    "A generous soul hands you",
    "A passerby feels bad and gives you",
    "You hold out your hands and receive",
    "A hooded figure quietly gives you",
    "Someone flips you"
];

module.exports = {
    name: "beg",
    description: "Beg for a few Ferns... if you're lucky.",

    async execute(message, args) {

        // Block DMs
        if (message.channel.isDMBased()) {
            return message.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const { author, guild } = message;
        const userId = author.id;
        const username = author.username;
        const ferns = '<:Ferns:1395219665638391818>';

        const space = 'ㅤ';
        const top = `**────── ${username} Begs ──────**`;
        const middle = `**· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·**`;
        const bottom = `**────── Come back for more! ──────**`;

        // Cooldown check
        const lastBeg = await db.lastclaim.get(`${userId}.beg`) || 0;
        const now = Date.now();

        if (now - lastBeg < begCooldown) {
            const timeLeft = Math.ceil((begCooldown - (now - lastBeg)) / 1000);

            return message.reply(
                `⏳ Hold up! You can beg again in **${timeLeft}s**.`
            );
        }

        // Random reward (1–15)
        const reward = Math.floor(Math.random() * MAX_REWARD) + MIN_REWARD;

        // Random phrase
        const phrase = begPhrases[Math.floor(Math.random() * begPhrases.length)];

        // Get balances
        let balance = await db.wallet.get(`${userId}.balance`) || 0;
        let bank = await db.bank.get(`${userId}.bank`) || 0;

        // Add reward
        balance += reward;

        // Save
        await db.wallet.set(`${userId}.balance`, balance);
        await db.lastclaim.set(`${userId}.beg`, now);

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(top)
            .setDescription(
                `${phrase} **${ferns}・${reward}**\n` +
                `ㅤㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤ**💰__Wallet__**ㅤㅤㅤ **🏦 __Bank__**\n` +
                `ㅤㅤㅤㅤ${ferns}・${balance.toLocaleString()}ㅤㅤㅤㅤ${ferns}・${bank.toLocaleString()}\n` +
                `ㅤㅤㅤㅤ${middle}\n${space}\n${bottom}`
            )
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setColor(0x207e37);

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [BEG] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${username} used the beg command and got ${reward} Ferns.`
        );
    }
};
