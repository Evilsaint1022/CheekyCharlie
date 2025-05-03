const { SlashCommandBuilder } = require('discord.js');
const { dropPartyEvent } = require('../../Events/Client/drop_party.js');
const db = require('../../Handlers/database');

// Track users who have picked the coin for the current drop
const pickedUsers = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pick')
        .setDescription('Pick up the dropped coins for points!'),

    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const username = interaction.user.username;

            // Access the current drop data
            const dropPartyData = dropPartyEvent.dropPartyData;
            const dropMessage = dropPartyData?.message;

            // Validate drop message
            if (!dropMessage || dropMessage.channel.id !== interaction.channel.id) {
                return interaction.reply({
                    content: '**🪙 No coins to pick up right now!**',
                    flags: 64,
                });
            }

            // Check if the user has already picked
            if (pickedUsers.has(userId)) {
                return interaction.reply({
                    content: '**🪙 You have already picked these coins!**',
                    flags: 64,
                });
            }

            // Add the user to the picked set
            pickedUsers.add(userId);

            // Fetch the user's current balance from the database
            let balance = 0;
            try {
                const userData = await db.balance.get(`${username}_${userId}`);
                balance = userData?.balance || 0;
            } catch (error) {
                console.error('Error fetching user balance from database:', error);
            }

            // Calculate coins earned and update the balance
            const coinsEarned = Math.floor(Math.random() * 41) + 10; // 10–50 coins
            balance += coinsEarned;

            // Save the updated balance to the database
            try {
                await db.balance.set(`${username}_${userId}`, { balance });
            } catch (error) {
                console.error('Error saving user balance to database:', error);
            }

            // Send response embed
            await interaction.reply({
                embeds: [
                    {
                        title: '🪙 Coins Picked!',
                        description: `You picked **${coinsEarned}** coins!`,
                        color: 0xFFD700,
                    },
                ],
            });

            // Delete the reply after 20 seconds
            setTimeout(async () => {
                try {
                    const message = await interaction.fetchReply();
                    if (message.deletable) await message.delete();
                } catch (err) {
                    console.error('Error deleting pick message:', err);
                }
            }, 20000);
        } catch (error) {
            console.error('Error in pick command execution:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '**🪙 Something went wrong while picking up the coins.**',
                    flags: 64,
                });
            }
        }
    },
};

// Reset the picked users when a new drop occurs
dropPartyEvent.on('newDrop', () => {
    pickedUsers.clear();
});
