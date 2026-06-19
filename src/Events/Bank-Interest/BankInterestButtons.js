const {
    Events,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const bankInterestPages = new Map();

module.exports.pages = bankInterestPages;

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        if (!interaction.isButton()) return;

        if (
            interaction.customId !== 'bankinterest_previous' &&
            interaction.customId !== 'bankinterest_next'
        ) return;

        const data = bankInterestPages.get(interaction.message.id);

        if (!data) {
            return interaction.reply({
                content: '❌ No Bank-Interest Data Has been Found!',
                ephemeral: true
            });
        }

        if (interaction.customId === 'bankinterest_previous') {
            data.page--;

            if (data.page < 0) {
                data.page = data.embeds.length - 1;
            }
        }

        if (interaction.customId === 'bankinterest_next') {
            data.page++;

            if (data.page >= data.embeds.length) {
                data.page = 0;
            }
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bankinterest_previous')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('bankinterest_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [data.embeds[data.page]],
            components: [row]
        });
    }
};