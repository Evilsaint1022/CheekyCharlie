// withdraw.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

module.exports = {
    name: "withdraw",
    aliases: ["wd"],
    description: "Withdraw points from your Bank to your Wallet.",

    async execute(message, args) {

        if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

        const { guild, author } = message;

        const custom = await db.settings.get(`${message.guild.id}.currencyicon`)
        const ferns = await db.default.get("Default.ferns");

        const customname = await db.settings.get(`${message.guild.id}.currencyname`)
        const fernsname = await db.default.get("Default.name");

        const top = `**🌿 __${author.username}'s Withdrawal!__  🌿**`;
        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const bar = `**─────────────────────────────────**`;
        const bottom = `🌿・Thanks for using Bank-NZ`;

        const space = 'ㅤ';

        const date = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit'
        });

        const safeUsername = author.username.replace(/\./g, '_');

        // Old key format
        const oldKey = `${safeUsername}_${author.id}`;
        const newKey = `${author.id}`;

        // -----------------------------------
        // 🔍 DB MIGRATION — Move Old → New
        // -----------------------------------
        const oldWalletObj = await db.wallet.get(oldKey);
        const oldBankObj = await db.bank.get(oldKey);

        if (oldWalletObj !== undefined) {
            await db.wallet.set(newKey, oldWalletObj);
            await db.wallet.delete(oldKey);
        }

        if (oldBankObj !== undefined) {
            await db.bank.set(newKey, oldBankObj);
            await db.bank.delete(oldKey);
        }

        // -----------------------------------
        // Always use ID-only key now
        // -----------------------------------
        const walletKey = `${newKey}.balance`;
        const bankKey = `${newKey}.bank`;

        let walletBalance = Number(await db.wallet.get(walletKey)) || 0;
        let bankBalance = Number(await db.bank.get(bankKey)) || 0;

        // Parse withdraw amount
        // !withdraw 100
        // !withdraw all
        if (!args[0]) {
            return message.reply("❌ Please specify an amount to withdraw.");
        }

        let withdrawAmount;

        const amount = args[0].toLowerCase();

        if (amount === "all") {

            if (date === `01/04`) {
            withdrawAmount = walletBalance
            } else {
            withdrawAmount = bankBalance;
        }

        } else {

            const match = amount.match(/^(\d+(?:\.\d+)?)(k|m|b|t)?$/);

            if (!match) {

                return message.reply(
                    "❌ Please enter a valid amount, such as `500`, `9k`, `8.5k`, `1m`, or `all`."
                );

            }

            const number = parseFloat(match[1]);
            const suffix = match[2];

            const multipliers = {
                k: 1_000,
                m: 1_000_000,
                b: 1_000_000_000,
                t: 1_000_000_000_000
            };

            withdrawAmount = number * (multipliers[suffix] || 1);

        }

        if (date === `01/04`) {

        if (!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > walletBalance) {
            return message.reply(
                `❌ You do not have enough ${customname || fernsname} in your Bank to deposit or you entered an invalid amount.`
            );
        }

        } else {

        if (!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > bankBalance) {
            return message.reply(
                `❌ You do not have enough ${customname || fernsname} in your Bank to withdraw or you entered an invalid amount.`
            );
        }
    }

    if (date === `01/04`) {

        // Update balances
        walletBalance -= withdrawAmount;
        bankBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.wallet.set(walletKey, walletBalance);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setDescription(
                `### ***🌿\`${author.username}'s Deposit!\`🌿***\n` +
                `_Successfully deposited **${custom || ferns} ${withdrawAmount.toLocaleString()}**_\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${custom || ferns}・\`${walletBalance.toLocaleString()}\`      ${custom || ferns}・\`${bankBalance.toLocaleString()}\`\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [DEPOSIT] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${author.username} deposited ${withdrawAmount.toLocaleString()} ${customname || fernsname}.`
        );

    } else {

        // Update balances
        bankBalance -= withdrawAmount;
        walletBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.wallet.set(walletKey, walletBalance);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setDescription(
                `### ***🌿\`${author.username}'s Withdrawal!\`🌿***\n` +
                `_Successfully withdrew **${custom || ferns} ${withdrawAmount.toLocaleString()}**_\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${custom || ferns}・\`${walletBalance.toLocaleString()}\`      ${custom || ferns}・\`${bankBalance.toLocaleString()}\`\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [WITHDRAW] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${author.username} withdrew ${withdrawAmount.toLocaleString()} ${customname || fernsname}.`
        );
    }

      // ------------------------------------------------------
      // 4️⃣ Log transaction
      // ------------------------------------------------------

        const channelId = await db.settings.get(`${guild.id}.banktransactions`);

        if (!channelId) return;

        let channel = guild.channels.cache.get(channelId);

        if (!channel) {
            channel = await guild.channels.fetch(channelId).catch(() => null);
        }

        if (!channel || !channel.isTextBased()) return;

        if (date === `01/04`) {

        const embedlog = new EmbedBuilder()
          .setDescription(
                `### ***🏦 \`Bank Transaction\`***\n` +
                `${bar}\n` +
                `🌿・**__Username:__** \`${author.username}\`\n` +
                `🌿・**__UserID:__** \`${author.id}\`\n\n` +
                `💰・**__Bank Deposit:__**\n  *** + ${custom || ferns} \`${withdrawAmount.toLocaleString()}\`***\n\n` +
                `***__Transaction TimeStamp:__***\n [\`${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}\`]\n` +
                `${bar}`
            )
            .setColor(0x207e37)
            .setFooter({ text: `🌿 Bank of New Zealand` })
          .setThumbnail(guild.iconURL());

         await channel.send({embeds: [embedlog]}).catch(console.error);

        } else {

        const embedlog = new EmbedBuilder()
          .setDescription(
                `### ***🏦 \`Bank Transaction\`***\n` +
                `${bar}\n` +
                `🌿・**__Username:__** \`${author.username}\`\n` +
                `🌿・**__UserID:__** \`${author.id}\`\n\n` +
                `💰・**__Bank Withdraw:__**\n  *** - ${custom || ferns} \`${withdrawAmount.toLocaleString()}\`***\n\n` +
                `***__Transaction TimeStamp:__***\n [\`${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}\`]\n` +
                `${bar}`
            )
            .setColor(0x207e37)
            .setFooter({ text: `🌿 Bank of New Zealand` })
          .setThumbnail(guild.iconURL());

         await channel.send({embeds: [embedlog]}).catch(console.error);
        }}
    };
