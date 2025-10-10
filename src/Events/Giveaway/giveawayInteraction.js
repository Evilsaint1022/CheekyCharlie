const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, user, message, guild } = interaction;

        if (!customId.startsWith('giveaway_')) return;

        const guildName = guild.name;
        const guildId = guild.id;
        const messageId = message.id;
        const giveawayId = `${guildName}_${guildId}_${messageId}`;

        const giveawayData = await db.giveaways.get(giveawayId);
        
        if (!giveawayData) {
            return interaction.reply({
                content: '❌ This giveaway no longer exists!',
                flags: 64
            });
        }

        // Handle reroll button
        if (customId === 'giveaway_reroll') {
            // Check if user has permission (admin or whitelisted role)
            const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
            const member = guild.members.cache.get(user.id);
            const hasAdminPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const hasModRole = whitelistedRoles.some(roleId => member.roles.cache.has(roleId));

            if (!hasAdminPermission && !hasModRole) {
                return interaction.reply({
                    content: '❌ You do not have permission to reroll giveaways!',
                    flags: 64
                });
            }

            if (!giveawayData.ended) {
                return interaction.reply({
                    content: '❌ This giveaway has not ended yet!',
                    flags: 64
                });
            }

            // Get participants
            const participants = await db.giveaway_participants.get(giveawayId) || [];

            if (participants.length <= 1) {
                return interaction.reply({
                    content: '❌ Cannot reroll a giveaway with 1 or fewer participants!',
                    flags: 64
                });
            }

            // Pick new random winners
            const winners = [];
            const participantsCopy = [...participants];
            const numWinners = Math.min(giveawayData.winners, participants.length);

            for (let i = 0; i < numWinners; i++) {
                const randomIndex = Math.floor(Math.random() * participantsCopy.length);
                winners.push(participantsCopy[randomIndex]);
                participantsCopy.splice(randomIndex, 1);
            }

            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

            const endedEmbed = new EmbedBuilder()
                .setTitle(giveawayData.prize)
                .setColor('#808080')
                .setDescription(`**Ended:** <t:${Math.floor(giveawayData.endTime / 1000)}:F>\n**Host:** <@${giveawayData.hostId}>\n\n**Winner(s):** ${winnerMentions}\n\n*🔄 Rerolled by ${user}*`)
                .setFooter({ text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` });

            await message.edit({ embeds: [endedEmbed] });

            await message.reply({
                content: `🔄 **Giveaway Rerolled!**\n🎉 New winner(s): ${winnerMentions} won **${giveawayData.prize}**!`
            });

            console.log(`[🎉] [GIVEAWAY REROLL] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Rerolled by ${user.username}`);

            return interaction.reply({
                content: '✅ Giveaway rerolled successfully!',
                flags: 64
            });
        }

        if (giveawayData.ended) {
            return interaction.reply({
                content: '❌ This giveaway has already ended!',
                flags: 64
            });
        }

        let participants = await db.giveaway_participants.get(giveawayId) || [];

        if (customId === 'giveaway_join') {
            
            const giveawaySettings = await db.giveaway_settings.get(`${guildName}_${guildId}`) || {};
            const whitelistEnabled = giveawaySettings.whitelistEnabled || false;
            const blacklistEnabled = giveawaySettings.blacklistEnabled || false;
            const whitelistedRoles = giveawaySettings.whitelistedRoles || [];
            const blacklistedRoles = giveawaySettings.blacklistedRoles || [];

            const member = guild.members.cache.get(user.id);
            const memberRoles = member.roles.cache.map(role => role.id);

            if (blacklistEnabled && blacklistedRoles.some(roleId => memberRoles.includes(roleId))) {
                return interaction.reply({
                    content: '❌ You are not allowed to join giveaways!',
                    flags: 64
                });
            }

            if (whitelistEnabled && !whitelistedRoles.some(roleId => memberRoles.includes(roleId))) {
                return interaction.reply({
                    content: '❌ You do not have the required role to join giveaways!',
                    flags: 64
                });
            }

            if (participants.includes(user.id)) {
                return interaction.reply({
                    content: '❌ You are already in this giveaway!',
                    flags: 64
                });
            }

            participants.push(user.id);
            await db.giveaway_participants.set(giveawayId, participants);

            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed)
                .setFooter({ text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` });

            await message.edit({ embeds: [newEmbed] });

            await interaction.reply({
                content: '✅ You have successfully joined the giveaway!',
                flags: 64
            });

            console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString('en-GB')}] ${user.username} joined giveaway ${giveawayId}`);

        } else if (customId === 'giveaway_leave') {
            
            if (!participants.includes(user.id)) {
                return interaction.reply({
                    content: '❌ You are not in this giveaway!',
                    flags: 64
                });
            }

            participants = participants.filter(id => id !== user.id);
            await db.giveaway_participants.set(giveawayId, participants);

            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed)
                .setFooter({ text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` });

            await message.edit({ embeds: [newEmbed] });

            await interaction.reply({
                content: '✅ You have successfully left the giveaway!',
                flags: 64
            });

            console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString('en-GB')}] ${user.username} left giveaway ${giveawayId}`);

        }
    }
};
