// daily.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours
const baseRewardAmount = 100; // Base daily reward

module.exports = {
    name: "daily",
    description: "Claim your daily Ferns!",

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

        const timestamp = new Date().toLocaleTimeString();

        const space = 'ㅤ';
        const top = `**🌿 __${username} Daily!__ 🌿**`;
        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const bottom = `🌿・Come Back Tomorrow for More!`;

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

        const lastClaim = await db.lastclaim.get(`${newKey}.daily`) || 0;
        const currentTime = Date.now();

        // Cooldown check
        if (currentTime - lastClaim < dailyCooldown) {
            const timeLeft = dailyCooldown - (currentTime - lastClaim);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            return message.reply(
                `⏳You have already claimed your daily reward!\n` +
                `Please wait **${hours}h ${minutes}m ${seconds}s** before claiming again.`
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
        await db.lastclaim.set(`${newKey}.daily`, currentTime);

        // Console Log
        console.log(
            `[🌿] [DAILY] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${username} used the daily command and got ${rewardAmount} Ferns.`
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
          .setTitle('🌿 **__Daily Logs__** 🌿')
          .setDescription(`\n**${username}** used the **Daily** command and got **${ferns}${rewardAmount.toLocaleString()}**.\n\n- **ServerName:** \`${message.guild.name}\`\n- **ServerID:** \`${message.guild.id}\`\n\n 🌿Thanks for using Bank-NZ!`)
          .setColor(0x207e37)
          .setThumbnail(message.guild.iconURL())

      await channel.send({ embeds: [embedlog] });

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(top)
            .setDescription(
                `_You have claimed your daily reward of_ **${ferns}・${rewardAmount.toLocaleString()}**!\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${ferns}・${balance.toLocaleString()}     ${ferns}・${bank.toLocaleString()}\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setColor(0x207e37);

        await message.reply({ embeds: [embed] });
    }
};
