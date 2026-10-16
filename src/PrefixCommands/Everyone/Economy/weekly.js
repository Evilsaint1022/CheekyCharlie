const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

function formatAmount(amount) {
  if (amount >= 1_000_000_000) {
    return (Math.floor(amount / 100_000_000) / 10)
      .toString().replace(/\.0$/, '') + 'b';
  }

  if (amount >= 1_000_000) {
    return (Math.floor(amount / 100_000) / 10)
      .toString().replace(/\.0$/, '') + 'm';
  }

  if (amount >= 1_000) {
    return (Math.floor(amount / 100) / 10)
      .toString().replace(/\.0$/, '') + 'k';
  }

  return amount.toString();
}

const weeklyCooldown = 7 * 24 * 60 * 60 * 1000; // 7 days
const BaseRewardAmount = 3000; // Weekly reward

module.exports = {
    name: "weekly",
    description: "Claim your weekly Ferns!",

    async execute(message, args) {

        if (message.channel.isDMBased()) {
            return message.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const custom = await db.settings.get(`${message.guild.id}.currencyicon`)
        const ferns = await db.default.get("Default.ferns");

        const customname = await db.settings.get(`${message.guild.id}.currencyname`)
        const fernsname = await db.default.get("Default.name");

        const { author, guild, member } = message;
        const username = author.username;
        const userId = author.id;

        const space = 'ㅤ';

        const top = `**🌿 \`${username}'s Weekly!\` 🌿**`;
        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const bar = `**─────────────────────────────────**`;
        const bottom = `🌿・Come back next week for more!`;

        const newKey = `${userId}`;
        // ------------------------------------------------------

        const lastClaim = await db.lastclaim.get(`${newKey}.weekly`) || 0;
        const currentTime = Date.now();

        // Cooldown check
        if (currentTime - lastClaim < weeklyCooldown) {
            const timeLeft = weeklyCooldown - (currentTime - lastClaim);
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
                (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor(
                (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
            );

            return message.reply(
                `⏳You have already claimed your weekly reward!\n` +
                `Please wait **${days}d ${hours}h ${minutes}m** before claiming again.`
            );
        }

        // Booster role check
        const guildSettings = await db.settings.get(`${guild.id}`) || {};
        const boosterRoleId = guildSettings.boostersRoleId;

        let rewardAmount = BaseRewardAmount;
        if (boosterRoleId && member.roles.cache.has(boosterRoleId)) {
            rewardAmount *= 2;
        }

        // Get balances
        let bank = await db.bank.get(`${newKey}.bank`) || 0;
        let balance = await db.wallet.get(`${newKey}.balance`) || 0;

        // Add reward
        balance += rewardAmount;

        // Save
        await db.wallet.set(`${newKey}.balance`, balance);
        await db.lastclaim.set(`${newKey}.weekly`, currentTime);

        // Format amounts 
        const formattedBalance = formatAmount(balance); 
        const formattedBank = formatAmount(bank);

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(top)
            .setDescription(
                `_You have claimed your weekly reward of **${custom || ferns}${rewardAmount.toLocaleString()} ${customname || fernsname}**!_\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ***${custom || ferns}・\`${formattedBalance}\`   ${custom || ferns}・\`${formattedBank}\`***\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setColor(0x207e37);

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [WEEKLY] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${username} used the weekly command and got ${rewardAmount.toLocaleString()} ${customname || fernsname}!`
        );
    }
};
