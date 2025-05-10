const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription("Displays The Leaderboard"),

    async execute(interaction) {
         // Fetch all users' balances from the database
        const allKeys = await db.balance.keys();
        const balances = (await Promise.all(
            allKeys
                .filter(key => key.endsWith('.balance')) // Filter keys that end with '.balance'
                .map(async key => {
                    const [username, userId] = key.split('_');
                    const balance = await db.balance.get(key) || 0;
                    return { userId, username, balance };
                })
        )).sort((a, b) => b.balance - a.balance);

        const username = interaction.user.username;
        const userBalanceEntry = balances.find(entry => entry.username === username);
        const userRank = userBalanceEntry ? balances.indexOf(userBalanceEntry) + 1 : 'Unranked';

        const itemsPerPage = 10;
        const totalPages = Math.ceil(balances.length / itemsPerPage);
        let currentPage = 0;

        const generateLeaderboardEmbed = (page) => {
            const start = page * itemsPerPage;
            const leaderboard = balances.slice(start, start + itemsPerPage)
                .map((entry, index) => {
                    return `**    \n__${start + index + 1}.__  ${entry.username} \n♢  🪙${entry.balance}**`;
                })
                .join('\n');

            return new EmbedBuilder()
                .setTitle("**╭─── The Leaderboard ───╮**")
                .setDescription((leaderboard || "No users found.") + `\n\n**╰─────[ Your Rank: #${userRank} ]─────╯**`)
                .setColor(0xFFFFFF)
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ text: `Page ${page + 1} of ${totalPages}`, iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();
        };

        const row = () => new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1)
            );

        await interaction.reply({ embeds: [generateLeaderboardEmbed(currentPage)], components: [row()] });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({ content: "You're not allowed to use these buttons.", flags: 64 });
            }

            if (buttonInteraction.customId === 'previous' && currentPage > 0) {
                currentPage--;
            } else if (buttonInteraction.customId === 'next' && currentPage < totalPages - 1) {
                currentPage++;
            } else if (buttonInteraction.customId === 'stop') {
                await buttonInteraction.update({ components: [] });
                collector.stop();
                return;
            }

            await buttonInteraction.update({ embeds: [generateLeaderboardEmbed(currentPage)], components: [row()] });
        });

        collector.on('end', () => {
            if (message.editable) {
                message.edit({ components: [] });
            }
        });
    }
};
