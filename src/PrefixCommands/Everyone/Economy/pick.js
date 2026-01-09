// pick.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const { dropPartyEvent } = require('../../../Events/Client/drop_party');
const db = require('../../../Handlers/database');

const pickedUsers = new Set();
const ferns = '<:Ferns:1395219665638391818>';

module.exports = {
    name: "pick",
    description: `Pick up the dropped Ferns for points!`,

    async execute(message, args) {

       if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

        try {
            const guild = message.guild;
            const user = message.author;
            const member = message.member;

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
                await db.wallet.set(newKey, oldWalletObj);
                await db.wallet.delete(oldKey);
            }

            // -------------------------------------------------
            // 🌿 PICK LOGIC
            // -------------------------------------------------
            const dropPartyData = dropPartyEvent.dropPartyData;
            const dropMessage = dropPartyData?.message;

            if (!dropMessage || dropMessage.channel.id !== message.channel.id) {
                
            const reply = await message.reply(`**No Ferns to pick up right now!**`);

            setTimeout(async () => {
                try {
                    if (reply.deletable) await reply.delete();
                    if (message.deletable) await message.delete();
                } catch (err) {
                    console.error('Error deleting pick message:', err);
                }
            }, 5000);
                return;
            }

            if (pickedUsers.has(userId)) {

            const reply = await message.reply(`**You have already picked these ferns!**`);

            setTimeout(async () => {
                try {
                    if (reply.deletable) await reply.delete();
                    if (message.deletable) await message.delete();
                } catch (err) {
                    console.error('Error deleting pick message:', err);
                }
            }, 5000);
                return;
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

            // Booster role check
            const guildKey = `${guild.id}`;
            const settings = await db.settings.get(guildKey);
            const boostersRoleId = settings?.boostersRoleId;

            if (boostersRoleId && member.roles.cache.has(boostersRoleId)) {
                coinsEarned *= 2;
            }

            balance += coinsEarned;

            console.log(
                `[🌿] [PICK] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
                `${guild.name} ${guild.id} ${user.username} picked ${coinsEarned.toLocaleString()} Ferns`
            );

            // Save new balance using ID-only key
            try {
                await db.wallet.set(newKey, { balance });
            } catch (error) {
                console.error('Error saving user balance:', error);
            }

            const reply = await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${ferns} Ferns Picked!`)
                        .setDescription(`You picked **${ferns}・${coinsEarned.toLocaleString()}**`)
                        .setColor(0xDE4949)
                ]
            });

            // Auto delete pick message after 20s
            setTimeout(async () => {
                try {
                    if (reply.deletable) await reply.delete();
                    if (message.deletable) await message.delete();
                } catch (err) {
                    console.error('Error deleting pick message:', err);
                }
            }, 20000);

        } catch (error) {
            console.error('Error in pick command execution:', error);
            await message.reply(`**${ferns} Something went wrong while picking up the Ferns.**`);
        }
    },
};

// Reset on new drop
dropPartyEvent.on('newDrop', () => {
    pickedUsers.clear();
});
