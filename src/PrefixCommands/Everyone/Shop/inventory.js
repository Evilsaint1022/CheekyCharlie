const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  name: 'inventory',
  aliases: ['inv'],

  async execute(message, args) {
    // Block DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guild = message.guild;

    // Get mentioned user or fallback to message author
    const user =
      message.mentions.users.first() ||
      (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
      message.author;

    const ferns = '<:Ferns:1395219665638391818>';
    const guildKey = `${guild.id}`;

    // OLD → NEW migration keys
    const safeUsername = user.username.replace(/\./g, '_');
    const oldKey = `${safeUsername}_${user.id}`;
    const newKey = `${user.id}`;

    // -------------------------------------------------------
    // 🔥 DATABASE MIGRATION LOGIC (UNCHANGED)
    // -------------------------------------------------------
    async function migrateData() {
      // -------- INVENTORY --------
      let inv = await db.inventory.get(guildKey).catch(() => undefined);

      if (inv && typeof inv === 'object') {
        if (inv[oldKey] && !inv[newKey]) {
          inv[newKey] = inv[oldKey];
          delete inv[oldKey];
          await db.inventory.set(guildKey, inv);

          console.log(`[MIGRATION] Inventory migrated ${oldKey} → ${newKey}`);
        }
      }

      // -------- WALLET --------
      const oldWallet = await db.wallet.get(oldKey).catch(() => undefined);
      const newWallet = await db.wallet.get(newKey).catch(() => undefined);

      if (oldWallet && !newWallet) {
        await db.wallet.set(newKey, oldWallet);
        await db.wallet.delete(oldKey);

        console.log(`[MIGRATION] Wallet migrated ${oldKey} → ${newKey}`);
      }

      // -------- BANK --------
      const oldBank = await db.bank.get(oldKey).catch(() => undefined);
      const newBank = await db.bank.get(newKey).catch(() => undefined);

      if (oldBank && !newBank) {
        await db.bank.set(newKey, oldBank);
        await db.bank.delete(oldKey);

        console.log(`[MIGRATION] Bank migrated ${oldKey} → ${newKey}`);
      }
    }

    await migrateData();
    // -------------------------------------------------------

    // Always use ID-based key
    const userKey = newKey;

    // Load inventory
    let fullInventory = {};
    try {
      const inv = await db.inventory.get(guildKey);
      fullInventory = typeof inv === 'object' && inv !== null ? inv : {};
    } catch {
      fullInventory = {};
    }

    const userData = fullInventory[userKey];

    // Empty inventory
    if (!userData || !Array.isArray(userData.inventory) || userData.inventory.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle(`${user.username}'s Inventory`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription('Inventory is empty.')
        .setColor(0xFF0000)
        .setFooter({ text: `Requested by ${message.author.username}` })
        .setTimestamp();

      return message.reply({ embeds: [emptyEmbed] });
    }

    // --------------------------
    // Build Inventory Embed
    // --------------------------
    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Inventory`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor('#de4949')
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();

    const inventoryText = userData.inventory
      .map((item, index) => {
        return `**${index + 1}.** **__${item.title}__** - **${ferns}${item.price.toLocaleString()}**`;
      })
      .join('\n');

    embed.setDescription(inventoryText);

    console.log(
      `[🌿] [INVENTORY] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${guild.name} ${guild.id} ${message.author.username} used the inventory command.`
    );

    return message.reply({ embeds: [embed] });
  }
};
