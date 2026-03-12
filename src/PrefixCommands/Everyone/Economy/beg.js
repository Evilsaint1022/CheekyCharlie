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
    "Someone flips you",
    "A stranger quietly gives you",
    "A kind passerby hands you",
    "A traveler spares you",
    "A wandering merchant gives you",
    "A friendly soul drops",
    "A mysterious stranger leaves you",
    "A generous traveler offers you",
    "A quiet benefactor gives you",
    "A passerby tosses you",
    "A hooded traveler hands you",
    "A stranger slips you",
    "A friendly face gives you",
    "A wandering soul spares you",
    "A traveler kindly gives you",
    "A generous stranger drops",
    "A quiet stranger leaves you",
    "A passing traveler hands you",
    "A kind soul tosses you",
    "A helpful stranger gives you",
    "A wandering stranger offers you",
    "A passerby quietly leaves you",
    "A traveler takes pity and gives you",
    "A stranger nods and gives you",
    "A friendly passerby drops",
    "A quiet traveler spares you",
    "Someone walking by tosses you",
    "A traveler shares",
    "A quiet benefactor drops",
    "A mysterious traveler hands you",
    "A kind wanderer gives you"
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

        // const ferns = '<:Ferns:1473337406659891252>'; // For Testing Formatting.
        const ferns = '<:Ferns:1395219665638391818>';

        const space = 'ㅤ';
        const top = `**🌿 __${username} Begs!__ 🌿**`;
        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const bottom = `🌿・Come Back for More!`;

        // Cooldown check
        const lastBeg = await db.lastclaim.get(`${userId}.beg`) || 0;
        const now = Date.now();

        if (now - lastBeg < begCooldown) {
            const timeLeft = Math.ceil((begCooldown - (now - lastBeg)) / 1000);

            return message.reply(
                `⏳ Begging too fast! You can beg again in **${timeLeft}s**.`
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
                `_${phrase}_ **${ferns}・${reward}**\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${ferns}・${balance.toLocaleString()}      ${ferns}・${bank.toLocaleString()}\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
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
