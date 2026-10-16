// withdraw.js (PREFIX COMMAND)
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

        const date = new Date().toLocaleDateString('en-NZ', {
        day: '2-digit',
        month: '2-digit'
        });

        const newKey = `${author.id}`;

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
        let withdrawAmount;
        
        if (!args[0]) {
            return message.reply(`You need to enter a amount!`)
        }

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

        // Aprils Fools Event ----------------------------------------
        if (date === `01/04`) {

        if (!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > walletBalance) {
            return message.reply(
                `❌ You do not have enough ${customname || fernsname} in your Bank to deposit or you entered an invalid amount.`
            );
        }

        // Update balances
        walletBalance -= withdrawAmount;
        bankBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.wallet.set(walletKey, walletBalance);

        // Format amounts 
        const formattedBalance = formatAmount(walletBalance); 
        const formattedBank = formatAmount(bankBalance);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setDescription(
                `### ***🌿 \`${author.username}'s Deposit!\` 🌿***\n` +
                `_Successfully deposited **${custom || ferns}${withdrawAmount.toLocaleString()} ${customname || fernsname}**_\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ***${custom || ferns}・\`${formattedBalance}\`    ${custom || ferns}・\`${formattedBank}\`***\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [DEPOSIT] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${author.username} deposited ${withdrawAmount.toLocaleString()} ${customname || fernsname}.`
        );

        // Transaction Log -------------------------------------------

        const channelId = await db.settings.get(`${guild.id}.banktransactions`);

        if (!channelId) return;

        let channel = guild.channels.cache.get(channelId);

        if (!channel) {
            channel = await guild.channels.fetch(channelId).catch(() => null);
        }

        if (!channel || !channel.isTextBased()) return;
        
        const embedlog = new EmbedBuilder()
          .setDescription(
                `### ***🏦 \`Bank Transaction\`***\n` +
                `${bar}\n` +
                `🌿・**__Username:__** \`${author.username}\`\n` +
                `🌿・**__UserID:__** \`${author.id}\`\n\n` +
                `💰・**__Bank Deposit:__**\n  *** + ${custom || ferns}\`${withdrawAmount.toLocaleString()}\` ${customname || fernsname}***\n\n` +
                `***__Transaction TimeStamp:__***\n***[\`${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})} - ${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}\`]***\n` +
                `${bar}`
            )
            .setColor(0x207e37)
            .setFooter({ text: `🌿 Bank of New Zealand` })
          .setThumbnail(guild.iconURL());

         await channel.send({embeds: [embedlog]}).catch(console.error);

        } else {

        // Production Code -------------------------------------------
        if (!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > bankBalance) {
            return message.reply(
                `❌ You do not have enough ${customname || fernsname} in your Bank to withdraw or you entered an invalid amount.`
            );
        }

        // Update balances
        bankBalance -= withdrawAmount;
        walletBalance += withdrawAmount;

        await db.bank.set(bankKey, bankBalance);
        await db.wallet.set(walletKey, walletBalance);

        // Format amounts 
        const formattedBalance = formatAmount(walletBalance); 
        const formattedBank = formatAmount(bankBalance);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setDescription(
                `### ***🌿 \`${author.username}'s Withdrawal!\` 🌿***\n` +
                `_Successfully withdrew **${custom || ferns}${withdrawAmount.toLocaleString()} ${customname || fernsname}**_\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ***${custom || ferns}・\`${formattedBalance}\`    ${custom || ferns}・\`${formattedBank}\`***\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [WITHDRAW] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${author.username} withdrew ${withdrawAmount.toLocaleString()} ${customname || fernsname}.`
        );

        // Transaction Log -------------------------------------------
    
        const channelId = await db.settings.get(`${guild.id}.banktransactions`);

        if (!channelId) return;

        let channel = guild.channels.cache.get(channelId);

        if (!channel) {
            channel = await guild.channels.fetch(channelId).catch(() => null);
        }

        if (!channel || !channel.isTextBased()) return;


        const embedlog = new EmbedBuilder()
          .setDescription(
                `### ***🏦 \`Bank Transaction\`***\n` +
                `${bar}\n` +
                `🌿・**__Username:__** \`${author.username}\`\n` +
                `🌿・**__UserID:__** \`${author.id}\`\n\n` +
                `💰・**__Bank Withdraw:__**\n  *** - ${custom || ferns}\`${withdrawAmount.toLocaleString()}\` ${customname || fernsname}***\n\n` +
                `***__Transaction TimeStamp:__***\n***[\`${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})} - ${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}\`]***\n` +
                `${bar}`
            )
            .setColor(0x207e37)
            .setFooter({ text: `🌿 Bank of New Zealand` })
          .setThumbnail(guild.iconURL());

         await channel.send({embeds: [embedlog]}).catch(console.error);
        }}
    };
