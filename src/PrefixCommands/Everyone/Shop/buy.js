const {
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ComponentType
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
    name: 'buy',
    aliases: ['purchase'],

    async execute(message, args) {

        // Prevent usage in DMs
        if (!message.guild) {
            return message.reply('This command cannot be used in DMs.');
        }

        const guild = message.guild;
        const user = message.author;

        const ferns = '<:Ferns:1395219665638391818>';
        const safeUsername = user.username.replace(/\./g, '_');

        // OLD + NEW KEYS
        const oldKey = `${safeUsername}_${user.id}`;
        const newKey = `${user.id}`;
        const guildKey = `${guild.id}`;

        // -------------------------------------------------------
        // 🔥 DATABASE MIGRATION LOGIC
        // -------------------------------------------------------
        async function migrateData() {
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
        }

        await migrateData();
        const dbKey = newKey;
        // -------------------------------------------------------

        // Load shop items
        let shopItems = [];
        try {
            const items = await db.shop.get(guildKey);
            shopItems = Array.isArray(items) ? items : [];
        } catch (err) {
            console.error('Error loading shop:', err);
            return message.reply('Failed to load shop items.');
        }

        if (shopItems.length === 0) {
            return message.reply('The shop is currently empty.');
        }

        // Build select menu
        const menu = new StringSelectMenuBuilder()
            .setCustomId('buy_menu')
            .setPlaceholder('Select an item to buy')
            .addOptions(
                shopItems.map((item, index) => ({
                    label: `${item.title.slice(0, 75)} - 🌿${item.price.toLocaleString()}`,
                    description: item.description.slice(0, 100),
                    value: index.toString()
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        const replyMessage = await message.reply({
            content: 'Select an item from the shop to buy:',
            components: [row]
        });

        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === user.id,
            time: 15_000,
            max: 1
        });

        collector.on('collect', async select => {
            const index = parseInt(select.values[0], 10);
            const selectedItem = shopItems[index];

            // Load balance
            let balance = 0;
            try {
                const bal = await db.wallet.get(dbKey);
                balance =
                    typeof bal === 'object' && bal !== null && 'balance' in bal
                        ? parseInt(bal.balance) || 0
                        : parseInt(bal) || 0;
            } catch {
                balance = 0;
            }

            if (balance < selectedItem.price) {
                return select.update({
                    content: `You need ${ferns}${selectedItem.price.toLocaleString()} to buy **${selectedItem.title}**.`,
                    components: []
                });
            }

            // Load inventory
            let fullInventory = {};
            try {
                const inv = await db.inventory.get(guildKey);
                fullInventory = typeof inv === 'object' && inv !== null ? inv : {};
            } catch {}

            const userInventoryData = fullInventory[dbKey] ?? { inventory: [] };
            const { inventory } = userInventoryData;

            // Already owned check
            if (inventory.some(i => i.title === selectedItem.title)) {
                return select.update({
                    content: `You already have **${selectedItem.title}** in your inventory!`,
                    components: []
                });
            }

            // Stock handling
            if (typeof selectedItem.stock === 'number') {
                if (selectedItem.stock > 0) selectedItem.stock -= 1;
                else if (selectedItem.stock === 0) {
                    return select.update({
                        content: 'That item is out of stock!',
                        components: []
                    });
                }
            }

            const { stock, ...cleanItem } = selectedItem;
            inventory.push(cleanItem);

            const newBalance = balance - selectedItem.price;

            // Save updates
            try {
                await db.shop.set(guildKey, shopItems);
                await db.inventory.set(guildKey, {
                    ...fullInventory,
                    [dbKey]: { inventory }
                });
                await db.wallet.set(dbKey, { balance: newBalance });
            } catch (err) {
                console.error('Error saving data:', err);
                return select.update({
                    content: 'Failed to complete your purchase.',
                    components: []
                });
            }

            return select.update({
                content: `You bought **${selectedItem.title}** for ${ferns}${selectedItem.price.toLocaleString()}!`,
                components: []
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                replyMessage.edit({
                    content: 'No selection made. Command expired.',
                    components: []
                }).catch(() => {});
            }
        });

        console.log(
            `[🌿] [BUY] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
            `${guild.name} ${guild.id} ${user.username} used the buy command.`
        );
    }
};
