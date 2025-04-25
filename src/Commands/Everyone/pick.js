const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { dropPartyEvent } = require('../../Events/Client/drop_party.js');

// Track users who have picked the coin for the current drop
const pickedUsers = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pick')
        .setDescription('Pick up the dropped coins for points!'),

    async execute(interaction) {
        try {
            const guild = interaction.guild;

            // Define balance and bank folder paths
            const balanceFolder = path.resolve(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Economy/Balance`);
            const bankFolder = path.resolve(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Economy/Bank`);

            // Make sure the folders exist
            fs.mkdirSync(balanceFolder, { recursive: true });
            fs.mkdirSync(bankFolder, { recursive: true });

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

            const member = interaction.member;

            // Check if the user has already picked
            if (pickedUsers.has(member.id)) {
                return interaction.reply({
                    content: '**🪙 You have already picked these coins!**',
                    flags: 64,
                });
            }

            // Add the user to the picked set
            pickedUsers.add(member.id);

            // Handle balance file
            const balanceFilePath = path.join(balanceFolder, `${member.user.username}.txt`);
            let balance = 0;

            if (fs.existsSync(balanceFilePath)) {
                const balanceData = fs.readFileSync(balanceFilePath, 'utf-8');
                balance = parseInt(balanceData, 10) || 0;
            }

            const coinsEarned = Math.floor(Math.random() * 41) + 10; // 10–50 coins
            balance += coinsEarned;

            fs.writeFileSync(balanceFilePath, balance.toString(), 'utf-8');

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
