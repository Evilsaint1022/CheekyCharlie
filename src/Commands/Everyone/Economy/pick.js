const { SlashCommandBuilder } = require('discord.js');
const { dropPartyEvent } = require('../../../Events/Client/drop_party');
const db = require('../../../Handlers/database');

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
            const guild = interaction.guild;
            const user = interaction.user;

            const userId = user.id;
            const safeUsername = user.username.replace(/\./g, '_');

            // Old full key object
            const oldKey = `${safeUsername}_${userId}`;

            // New userID-only object
            const newKey = `${userId}`;

            // -------------------------------------------------
            // 🔍 DB Migration: move old object → userId only
            // -------------------------------------------------

            const oldWalletObj = await db.wallet.get(oldKey);

            if (oldWalletObj !== undefined) {
                await db.wallet.set(newKey, oldWalletObj); // copy data
                await db.wallet.delete(oldKey);            // remove old whole object
            }

            // -------------------------------------------------
            // 🌿 PICK LOGIC
            // -------------------------------------------------

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

            // Load balance using new key
            let balance = 0;

            try {
                const userData = await db.wallet.get(newKey);
                balance = userData?.balance || 0;
            } catch (error) {
                console.error('Error fetching user balance:', error);
            }

            let coinsEarned = Math.floor(Math.random() * 41) + 10; // 10–50

            // Boosters role check
            const guildKey = `${guild.id}`;
            const settings = await db.settings.get(guildKey);
            const boostersRoleId = settings?.boostersRoleId;

            if (boostersRoleId && interaction.member.roles.cache.has(boostersRoleId)) {
                coinsEarned *= 2;
            }

            balance += coinsEarned;

            console.log(
                `[🌿] [PICK] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
                `${guild.name} ${user.username} picked ${coinsEarned.toLocaleString()} Ferns`
            );

            // Save new balance using ID-only key
            try {
                await db.wallet.set(newKey, { balance });
            } catch (error) {
                console.error('Error saving user balance:', error);
            }

            await interaction.reply({
                embeds: [
                    {
                        title: `${ferns} Ferns Picked!`,
                        description: `You picked **${ferns}・${coinsEarned.toLocaleString()}**`,
                        color: 0xDE4949,
                    },
                ],
            });

            // Auto delete pick message after 20s
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

// Reset on new drop
dropPartyEvent.on('newDrop', () => {
    pickedUsers.clear();
});
