const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

const weeklyCooldown = 7 * 24 * 60 * 60 * 1000; // 7 days
const baseRewardAmount = 1000; // Weekly reward

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

        // const ferns = '<:Ferns:1473337406659891252>'; // For Testing Formatting.
        const ferns = '<:Ferns:1395219665638391818>';

        const { author, guild, member } = message;
        const username = author.username;
        const userId = author.id;

        const space = 'ㅤ';

        const top = `**🌿 __${username}'s Weekly!__ 🌿**`;
        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const bottom = `🌿・Come Back Next Week for More!`;

        // ------------------------------------------------------
        // 1️⃣ MIGRATION — move username-based keys → ID-only keys
        // ------------------------------------------------------
        const safeUsername = username.replace(/\./g, '_');
        const oldKey = `${safeUsername}_${userId}`;
        const newKey = `${userId}`;

        const oldWalletObj = await db.wallet.get(oldKey);
        const oldBankObj = await db.bank.get(oldKey);
        const oldLastClaimObj = await db.lastclaim.get(oldKey);

        if (oldWalletObj !== undefined) {
            await db.wallet.set(newKey, oldWalletObj);
            await db.wallet.delete(oldKey);
        }

        if (oldBankObj !== undefined) {
            await db.bank.set(newKey, oldBankObj);
            await db.bank.delete(oldKey);
        }

        if (oldLastClaimObj !== undefined) {
            await db.lastclaim.set(newKey, oldLastClaimObj);
            await db.lastclaim.delete(oldKey);
        }
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

        let rewardAmount = baseRewardAmount;
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

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(top)
            .setDescription(
                `_You have claimed your weekly reward of_ **${ferns}・${rewardAmount.toLocaleString()}**!\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${ferns}・${balance.toLocaleString()}     ${ferns}・${bank.toLocaleString()}\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setColor(0x207e37);

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [WEEKLY] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${username} used the weekly command and got ${rewardAmount} Ferns.`
        );

      // ------------------------------------------------------
      // 4️⃣ Log transaction
      // ------------------------------------------------------
      const channelId = '1481927633678762084';

      let channel = message.guild.channels.cache.get(channelId);

      if (!channel) {
          channel = await message.guild.channels.fetch(channelId).catch(() => null);
      }

      if (!channel) {
          return;
      }

      const embedlog = new EmbedBuilder()
          .setTitle('💰・**__Transaction Logs__**')
          .setDescription(`${middle}\n**${author.username}** used  the **Weekly** command and received **${ferns}${rewardAmount.toLocaleString()}**.\n\n- **__ServerName:__** \`${message.guild.name}\`\n- **__ServerID:__** \`${message.guild.id}\`\n${middle}\n\n- 🌿・Thanks for using Bank-NZ!`)
          .setColor(0x207e37)
          .setThumbnail(message.guild.iconURL())

      await channel.send({ embeds: [embedlog] });

    }
};
