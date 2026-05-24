const { EmbedBuilder } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  name: "tax",
  aliases: [],
  description: "View your current tax information.",

  async execute(message) {

    const guild = message.guild;
    const userId = message.author.id;

    const currentTax = await db.tax.get(`${userId}.tax`) || 0;
    const lastPaid = await db.tax.get(`${userId}.lastpayed`) || null;

    const custom = await db.settings.get(`${guild.id}.currencyicon`)
    const ferns = await db.default.get("Default.ferns");

    const customname = await db.settings.get(`${guild.id}.currencyname`)
    const fernsname = await db.default.get("Default.name");


    const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;

    // format last paid
    let lastPaidText = "🌿・Never Paid";
    let bottom = "🌿・IRD NZ";

    if (lastPaid) {
      const date = new Date(lastPaid);
      lastPaidText = `<t:${Math.floor(date.getTime() / 1000)}:R>`;
    }

    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;

    const overdue = !lastPaid || now - lastPaid > week;

    const embed = new EmbedBuilder()
      .setColor(overdue ? 0xff4d4d : 0x2ecc71)
      .setTitle(`**🧾 __${message.author.tag} Tax's__**`)
      .setDescription(
        `_You are viewing your tax information._\n` +
        `${middle}\n` +
        `ㅤ **💰__Current Tax__**   **⏰__Last Paid__**\n` +
        `ㅤ ${custom || ferns}・${currentTax.toLocaleString()}      ${lastPaidText}\n` +
        `${middle}\n`
      )
      .setFooter({ text: bottom })
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};