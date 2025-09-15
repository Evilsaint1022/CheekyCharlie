const { SlashCommandBuilder } = require('discord.js');
const { dropPartyEvent } = require('../../../Events/Client/drop_party');
const db = require('../../../Handlers/database');

// Track users who have picked the coin for the current drop
const pickedUsers = new Set();
const ferns = '<:Ferns:1395219665638391818>';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pick')
        .setDescription(`Pick up the dropped ${ferns} for points!`),

    async execute(interaction) {
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        try {
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const username = interaction.user.username;

            // Use safe key for DB access (replace . with _)
            const safeUsername = username.replace(/\./g, '_');
            const dbKey = `${safeUsername}_${userId}`;

            const dropPartyData = dropPartyEvent.dropPartyData;
            const dropMessage = dropPartyData?.message;

            if (!dropMessage || dropMessage.channel.id !== interaction.channel.id) {
                return interaction.reply({
                    content: `**${ferns} No Ferns to pick up right now!**`,
                    flags: 64,
                });
            }

            if (pickedUsers.has(userId)) {
                return interaction.reply({
                    content: `**${ferns} You have already picked these ferns!**`,
                    flags: 64,
                });
            }

            pickedUsers.add(userId);

            // Fetch the user's current balance from the database
            let balance = 0;
        try {
            const userData = await db.wallet.get(dbKey);
            balance = userData?.balance || 0;
        }   catch (error) {
            console.error('Error fetching user balance from database:', error);
        }

            let coinsEarned = Math.floor(Math.random() * 41) + 10; // 10–50 Ferns

            // Check if user has booster role to apply 2x bonus
            const guildKey = `${interaction.guild.name}_${interaction.guild.id}`;
            const settings = await db.settings.get(guildKey);
            const boostersRoleId = settings?.boostersRoleId;

        if (boostersRoleId && interaction.member.roles.cache.has(boostersRoleId)) {
            coinsEarned *= 2;
        }

            balance += coinsEarned;


            console.log(`[🌿] [${new Date().toLocaleTimeString()}] ${interaction.guild.name} ${username} picked ${coinsEarned.toLocaleString()} Ferns`);

            try {
                await db.wallet.set(dbKey, { balance });
            } catch (error) {
                console.error('Error saving user balance to database:', error);
            }

            await interaction.reply({
                embeds: [
                    {
                        title: `${ferns} Ferns Picked!`,
                        description: `You picked **${ferns}${coinsEarned.toLocaleString()}**`,
                        color: 0xFFFFFF,
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
                    content: `**${ferns} Something went wrong while picking up the Ferns.**`,
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
