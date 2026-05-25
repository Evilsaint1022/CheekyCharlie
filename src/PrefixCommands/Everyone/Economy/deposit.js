// deposit.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require("../../../Handlers/database");

module.exports = {
    name: "deposit",
    aliases: ["dep"],
    description: "Deposit points from your Wallet to your Bank.",

    async execute(message, args) {

        if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

        const { guild, author } = message;

        const top = `**🌿 __${author.username}'s Deposit!__ 🌿**`;
        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const bar = `**─────────────────────────────────**`;
        const bottom = `🌿・Thanks for using Bank-NZ`;

        const space = 'ㅤ';

        const custom = await db.settings.get(`${guild.id}.currencyicon`)
        const ferns = await db.default.get("Default.ferns");

        const customname = await db.settings.get(`${guild.id}.currencyname`)
        const fernsname = await db.default.get("Default.name");

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
        let balance = await db.wallet.get(`${newKey}.balance`) || 0;
        let bank = await db.bank.get(`${newKey}.bank`) || 0;

        // Parse deposit amount
        // !deposit 100
        // !deposit all
        let depositAmount;

        if (!args[0]) {
            return message.reply("❌ Please specify an amount to deposit.");
        }

        if (args[0].toLowerCase() === "all") {
            depositAmount = balance;
        } else {
            depositAmount = parseInt(args[0], 10);
        }

        if (!depositAmount || depositAmount <= 0 || balance < depositAmount) {
            return message.reply(
                `❌ You do not have enough ${customname || fernsname} to deposit or you might of entered an invalid amount.`
            );
        }

        balance -= depositAmount;
        bank += depositAmount;

        // Save
        await db.wallet.set(`${newKey}.balance`, balance);
        await db.bank.set(`${newKey}.bank`, bank);

        const embed = new EmbedBuilder()
            .setColor(0x207e37)
            .setTitle(top)
            .setDescription(
                `_Successfully deposited **${custom || ferns} ${depositAmount.toLocaleString()}**_\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${custom || ferns}・${balance.toLocaleString()}     ${custom || ferns}・${bank.toLocaleString()}\n` +
                `${middle}`
            )
            .setFooter({ text: bottom })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))

        await message.reply({ embeds: [embed] });

        console.log(
            `[🌿] [DEPOSIT] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} (${guild.id}) ${author.tag} deposited ${depositAmount.toLocaleString()} ${customname || fernsname}`
        );

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

      const embedlog = new EmbedBuilder()
          .setTitle('🏦・**__Transaction Logs__**')
          .setDescription(
                `${bar}\n` +
                `〉**__Username:__** \`${author.username}\`\n` +
                `〉**__UserID:__** \`${author.id}\`\n\n` +
                `💰・**__Bank Deposit:__** ${custom || ferns}\`${depositAmount.toLocaleString()}\` ${customname || fernsname}\n\n` +
                `〉***__Transaction TimeStamp:__***\n [\`${new Date().toLocaleDateString('en-GB')}\`] [\`${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}\`]\n` +
                `${bar}`
            )
          .setColor(0x207e37)
          .setFooter({ text: `🌿 Bank of New Zealand` })
          .setThumbnail(author.displayAvatarURL({ dynamic: true }));

        await channel.send({embeds: [embedlog]}).catch(console.error);
      }
    };