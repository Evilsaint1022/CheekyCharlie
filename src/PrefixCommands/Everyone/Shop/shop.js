const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
    name: 'shop',
    aliases: ['store'],

    async execute(message, args) {

        // Prevent usage in DMs
        if (!message.guild) {
            return message.reply('This command cannot be used in DMs.');
        }

        const guild = message.guild;
        const guildKey = `${guild.id}`;
        let shopItems = [];

        try {
            const items = await db.shop.get(guildKey);
            shopItems = Array.isArray(items) ? items : [];
        } catch (error) {
            console.error('Failed to get shop data:', error);
            return message.reply(
                'Failed to load shop items. Please try again later.'
            );
        }

        if (shopItems.length === 0) {
            return message.reply('The shop is currently empty!');
        }

        shopItems.sort((a, b) => a.price - b.price);

        const itemsPerPage = 5;
        const totalPages = Math.ceil(shopItems.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const items = shopItems.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle(`**╭─── 🌿 The ${guild.name} Shop ───╮**`)
                .setDescription(
                    '*You can buy things using the **`?buy`** command.*\n' +
                    '· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·'
                )
                .setColor(0x207e37)
                .setFooter({
                    text: `Page ${page + 1} of ${totalPages}`,
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setThumbnail(guild.iconURL())
                .setTimestamp();

            items.forEach((item, index) => {
                const globalIndex = start + index + 1;
                const displayStock =
                    item.stock === -1 || item.stock === undefined
                        ? '∞'
                        : item.stock.toLocaleString();

                embed.addFields({
                    name: `${globalIndex} 🌿**__${item.title}__**`,
                    value:
                        `${item.description}\n` +
                        `> • **Role Reward:** <@&${item.roleId}>\n` +
                        `> • **Price:** <:Ferns:1395219665638391818> ${item.price.toLocaleString()}\n` +
                        `> • **Stock:** ${displayStock}`
                });
            });

            embed.addFields(
                { name: '\n', value: `*🌿 Thanks for using The ${guild.name} Shop!*` },
                { name: '\n', value: '**╰────────────────────────────╯**' }
            );

            console.log(
                `[🌿] [SHOP] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
                `${guild.name} ${guild.id} ${message.author.username} used the shop command.`
            );

            return embed;
        };

        const generateButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),

                new ButtonBuilder()
                    .setCustomId('shop_stop')
                    .setLabel('Stop')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('shop_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1)
            );
        };

        const shopMessage = await message.reply({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons()]
        });

        const collector = shopMessage.createMessageComponentCollector({
            time: 60_000
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== message.author.id) {
                return buttonInteraction.reply({
                    content: 'You cannot interact with this menu.',
                    ephemeral: true
                });
            }

            if (buttonInteraction.customId === 'shop_prev') currentPage--;
            if (buttonInteraction.customId === 'shop_next') currentPage++;

            if (buttonInteraction.customId === 'shop_stop') {
                collector.stop();
                return buttonInteraction.update({ components: [] });
            }

            await buttonInteraction.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons()]
            });
        });

        collector.on('end', async () => {
            try {
                await shopMessage.edit({ components: [] });
            } catch {}
        });
    }
};
