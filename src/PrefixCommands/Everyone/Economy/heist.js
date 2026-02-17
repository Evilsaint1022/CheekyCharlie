const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path if needed

module.exports = {
  name: 'heist',
  description: 'Heist another user\'s Bank',

  async execute(message, args) {

    const robber = message.author;
    const target =
      message.mentions.users.first() ||
      (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    if (!target) return message.reply('You must mention someone to heist!');

    if (target.bot) return message.reply('You cannot heist a bot!');

    if (target.id === robber.id) return message.reply('You cannot heist yourself!');

    // Target Passive Mode Check
    let targetPassive = await db.passive.get(target.id);

    // If no data exists, set default to true
    if (targetPassive === undefined || targetPassive === null) {
      targetPassive = { passive: true };
      await db.passive.set(target.id, targetPassive);
    }

    // If passive is enabled
    if (targetPassive.passive === true) {
      return message.reply(`🛡️ ${target.username} is in passive mode!`);
    }


    // Robber Passive Mode Check
    const robberPassive = await db.passive.get(robber.id);

    if (robberPassive?.passive) {
      return message.reply(`🛡️ You Cant Heist In Passive Mode!`);
    }

    // Command Cooldown check
    const commandcooldown = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const lastUsed = await db.cooldowns.get(`${robber.id}.lastheist`);

    if (now - lastUsed < commandcooldown) {
      const timeLeft = commandcooldown - (now - lastUsed);

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      return message.reply(
        `⏳ Hold up! You can heist again in **${hours}h ${minutes}m ${seconds}s**.`
      );
    }

    // Target Cooldown check
    const UserCooldown = 24 * 60 * 60 * 1000; // 24 hours
    const lastheist = await db.stolen.get(`${target.id}.timestamp`);

    if (now - lastheist < UserCooldown) {
      const timeLeft = UserCooldown - (now - lastheist);

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      return message.reply(
        `⏳ Hold up! ${target.username} can't be stolen from again for **${hours}h ${minutes}m ${seconds}s**.`
      );
    }

    const top = `**🌿 __Heist Successful__ 🌿 **`;
    const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const bottom = `🌿・Banks are not Safe!`;

    // const ferns = '<:Ferns:1473337406659891252>'; // For Testing Formatting.
    const ferns = '<:Ferns:1395219665638391818>';

    // Get banks
    const robberData = await db.bank.get(robber.id) ?? { bank: 0 };
    const targetData = await db.bank.get(target.id) ?? { bank: 0 };

    const robberBank = robberData.bank ?? 0;
    const targetBank = targetData.bank ?? 0;

    if (targetBank <= 0) {
      return message.reply(`${target.username} has no money in their bank to steal!`);
    }

    const randomAmount = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
    const stealAmount = Math.min(randomAmount, targetBank);

    // Update cooldowns
    await db.stolen.set(`${target.id}.timestamp`, now);
    await db.cooldowns.set(`${robber.id}.lastheist`, now);

    // Update balances
    targetData.bank -= stealAmount;
    robberData.bank += stealAmount;

    // Save back to db.bank
    await db.bank.set(target.id, targetData);
    await db.bank.set(robber.id, robberData);

      // DB lookup AFTER migration
      const balance = await db.wallet.get(`${robber.id}.balance`) || 0;
      const bank = await db.bank.get(`${robber.id}.bank`) || 0;

    console.log(
      `[🌿] [HEIST] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${message.guild.name} ${message.guild.id} ${robber.username} used the heist command to heist ${target.username} for ${stealAmount} ferns.`
    );

    const embed = new EmbedBuilder()
      .setColor(0x207e37)
      .setTitle(top)
      .setDescription(
        `_You Heisted_ **${target.username}** _for_ **${stealAmount}** _Ferns!_\n` +
        `${middle}\n` +
        `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
        `ㅤ ${ferns}・${balance.toLocaleString()}      ${ferns}・${bank.toLocaleString()}\n` +
        `${middle}`
      )
      .setFooter({ text: bottom })
      .setThumbnail(robber.displayAvatarURL({ dynamic: true }));

    return message.reply({ embeds: [embed] });
  }
};
