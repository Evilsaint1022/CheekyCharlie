const { Events, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, user, message, guild } = interaction;

        if (!customId.startsWith('giveaway_')) return;

        const guildName = guild.name;
        const guildId = guild.id;

        if (customId.startsWith('giveaway_confirm_leave_')) {
            
            const originalMessageId = customId.replace('giveaway_confirm_leave_', '');
            const originalGiveawayId = `${guildName}_${guildId}_${originalMessageId}`;
            
            const originalGiveawayData = await db.giveaways.get(originalGiveawayId);
            
            if (!originalGiveawayData) {
                return interaction.reply({
                    content: '❌ This giveaway no longer exists!',
                    flags: MessageFlags.Ephemeral
                });
            }

            let participants = await db.giveaway_participants.get(originalGiveawayId) || [];
            
            if (!participants.includes(user.id)) {
                return interaction.reply({
                    content: '❌ You are not in this giveaway!',
                    flags: MessageFlags.Ephemeral
                });
            }

            participants = participants.filter(id => id !== user.id);
            await db.giveaway_participants.set(originalGiveawayId, participants);

            const participantsMap = await db.giveaway_participants.get(originalGiveawayId + "_map") || {};
            delete participantsMap[user.id];
            await db.giveaway_participants.set(originalGiveawayId + "_map", participantsMap);

            const channel = guild.channels.cache.get(originalGiveawayData.channelId);
            if (channel) {
                const giveawayMessage = await channel.messages.fetch(originalMessageId).catch(() => null);
                if (giveawayMessage) {
                    const embed = giveawayMessage.embeds[0];
                    const newEmbed = EmbedBuilder.from(embed)
                        .setFooter({ text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` });

                    await giveawayMessage.edit({ embeds: [newEmbed] });
                }
            }

            await interaction.reply({
                content: '✅ You have left the giveaway!',
                flags: MessageFlags.Ephemeral
            });

            console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString('en-GB')}] ${user.username} left giveaway ${originalGiveawayId}`);
            return;
        }

        if (customId.startsWith('giveaway_reroll_anyway_')) {
            
            const originalMessageId = customId.replace('giveaway_reroll_anyway_', '');
            const originalGiveawayId = `${guildName}_${guildId}_${originalMessageId}`;
            
            const originalGiveawayData = await db.giveaways.get(originalGiveawayId);
            
            if (!originalGiveawayData) {
                return interaction.reply({
                    content: '❌ This giveaway no longer exists!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
            const member = guild.members.cache.get(user.id);
            const hasAdminPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const hasModRole = whitelistedRoles.some(roleId => member.roles.cache.has(roleId));

            if (!hasAdminPermission && !hasModRole) {
                return interaction.reply({
                    content: '❌ You do not have permission to reroll giveaways!',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!originalGiveawayData.ended) {
                return interaction.reply({
                    content: '❌ This giveaway has not ended yet!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const participants = await db.giveaway_participants.get(originalGiveawayId) || [];

            if (participants.length < 1) {
                return interaction.reply({
                    content: '❌ There are no participants in this giveaway!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const winners = [];
            const participantsCopy = [...participants];
            const numWinners = Math.min(originalGiveawayData.winners, participants.length);

            for (let i = 0; i < numWinners; i++) {
                const randomIndex = Math.floor(Math.random() * participantsCopy.length);
                winners.push(participantsCopy[randomIndex]);
                participantsCopy.splice(randomIndex, 1);
            }
            
            originalGiveawayData.winnerIds = winners;
            await db.giveaways.set(originalGiveawayId, originalGiveawayData);

            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

            const topRowFromat    = "**─────────── 🌿GIVEAWAY🌿 ──────────**"
            const middle =              `ㅤㅤ · · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`
            const bottomRowFormat = "**───────────────────────────────────────**"

            const space = 'ㅤ'

            const endedEmbed_reroll = new EmbedBuilder()
                .setTitle(`${topRowFromat}`)
                .setDescription(`\n${space}\n${middle}\nㅤㅤ**・Prize:** ${originalGiveawayData.prize}\nㅤㅤ**・Ended:** <t:${Math.floor(originalGiveawayData.endTime / 1000)}:F>\n${middle}\nㅤㅤ**・Winner(s):** ${winnerMentions}\nㅤㅤ・Rerolled by ${user}\n${space}\n${bottomRowFormat}`)
                .setColor('#FFFFFF')

            const channel = guild.channels.cache.get(originalGiveawayData.channelId);
            if (channel) {
                const giveawayMessage = await channel.messages.fetch(originalMessageId).catch(() => null);
                if (giveawayMessage) {
                    await giveawayMessage.edit({ embeds: [endedEmbed_reroll] });

                    await giveawayMessage.reply({
                        content: `🔄 **Giveaway Rerolled!**\n🎉 New winner(s): ${winnerMentions} Won the **${originalGiveawayData.prize} Giveaway**!! 🎉`
                    });
                }
            }

            await interaction.reply({
                content: '✅ Giveaway rerolled successfully (including previous winners)!',
                flags: MessageFlags.Ephemeral
            });

            console.log(`[🎉] [GIVEAWAY REROLL ANYWAY] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Rerolled by ${user.username}`);
            return;
        }

        const messageId = message.id;
        const giveawayId = `${guildName}_${guildId}_${messageId}`;

        const giveawayData = await db.giveaways.get(giveawayId);
        
        if (!giveawayData) {
            return interaction.reply({
                content: '❌ This giveaway no longer exists!',
                flags: MessageFlags.Ephemeral
            });
        }

        if (customId === 'giveaway_reroll') {
            
            const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
            const member = guild.members.cache.get(user.id);
            const hasAdminPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const hasModRole = whitelistedRoles.some(roleId => member.roles.cache.has(roleId));

            if (!hasAdminPermission && !hasModRole) {
                return interaction.reply({
                    content: '❌ You do not have permission to reroll giveaways!',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!giveawayData.ended) {
                return interaction.reply({
                    content: '❌ This giveaway has not ended yet!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const participants = await db.giveaway_participants.get(giveawayId) || [];
            const oldWinners = giveawayData.winnerIds || [];

            const eligibleParticipants = participants.filter(id => !oldWinners.includes(id));

            if (eligibleParticipants.length < 1) {
                const continueAnywayRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`giveaway_reroll_anyway_${messageId}`)
                            .setLabel('Continue Anyway')
                            .setStyle(ButtonStyle.Danger)
                    );

                return interaction.reply({
                    content: '❌ No eligible participants remain for reroll (all participants were previous winners)!',
                    components: [continueAnywayRow],
                    flags: MessageFlags.Ephemeral
                });
            }

            const winners = [];
            const participantsCopy = [...eligibleParticipants];
            const numWinners = Math.min(giveawayData.winners, eligibleParticipants.length);

            for (let i = 0; i < numWinners; i++) {
                const randomIndex = Math.floor(Math.random() * participantsCopy.length);
                winners.push(participantsCopy[randomIndex]);
                participantsCopy.splice(randomIndex, 1);
            }

            
            giveawayData.winnerIds = [...oldWinners, ...winners];
            await db.giveaways.set(giveawayId, giveawayData);

            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

            const topRowFromat    = "**─────────── 🌿GIVEAWAY🌿 ──────────**"
            const middle =              `ㅤㅤ · · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`
            const bottomRowFormat = "**───────────────────────────────────────**"

            const space = 'ㅤ'

            const endedEmbed_reroll = new EmbedBuilder()
                .setTitle(`${topRowFromat}`)
                .setDescription(`\n${space}\n${middle}\nㅤㅤ**・Prize:** ${giveawayData.prize}\nㅤㅤ**・Ended:** <t:${Math.floor(giveawayData.endTime / 1000)}:F>\n${middle}\nㅤㅤ**・Winner(s):** ${winnerMentions}\nㅤㅤ・Rerolled by ${user}\n${space}\n${bottomRowFormat}`)
                .setColor('#FFFFFF')

            await message.edit({ embeds: [endedEmbed_reroll] });

            await message.reply({
                content: `🔄 **Giveaway Rerolled!**\n🎉 New winner(s): ${winnerMentions} Won the **${giveawayData.prize} Giveaway**!! 🎉`
            });

            console.log(`[🎉] [GIVEAWAY REROLL] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Rerolled by ${user.username}`);

            return interaction.deferUpdate();
        }

        if (customId === "giveaway_view-participants") {

            const participantsMap = await db.giveaway_participants.get(giveawayId + "_map") || {};
            const messageLink = message.url;

            const participants = Object.values(participantsMap);

            if ( participants.length <= 0 ) {
                const participantsEmbed = new EmbedBuilder()
                    .setTitle("Participants for " + messageLink)
                    .setDescription(`There are no participants in this giveaway.`)  
                    
                await interaction.reply({ embeds: [participantsEmbed], flags: MessageFlags.Ephemeral });
                return;
            }

            const participantsEmbed = new EmbedBuilder()
                .setTitle("Participants for " + messageLink)
                .setDescription(`${participants.join("\n")}`)
                .setFooter({ text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` });

            await interaction.reply({ embeds: [participantsEmbed], flags: MessageFlags.Ephemeral });
            return;

        }

        if (giveawayData.ended) {
            return interaction.reply({
                content: '❌ This giveaway has already ended!',
                flags: MessageFlags.Ephemeral
            });
        }

        let participants = await db.giveaway_participants.get(giveawayId) || [];

        if (customId === 'giveaway_toggle') {
            
            if (participants.includes(user.id)) {
                
                const confirmEmbed = new EmbedBuilder()
                    .setDescription('⚠️ Are you sure you want to leave this giveaway?')
                    .setColor('#FFA500');

                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`giveaway_confirm_leave_${messageId}`)
                            .setLabel('Confirm Leave')
                            .setStyle(ButtonStyle.Danger)
                    );

                return interaction.reply({
                    embeds: [confirmEmbed],
                    components: [confirmRow],
                    flags: MessageFlags.Ephemeral
                });
            }

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
                    flags: MessageFlags.Ephemeral
                });
            }

            if (whitelistEnabled && !whitelistedRoles.some(roleId => memberRoles.includes(roleId))) {
                return interaction.reply({
                    content: '❌ You do not have the required role to join giveaways!',
                    flags: MessageFlags.Ephemeral
                });
            }

            participants.push(user.id);
            await db.giveaway_participants.set(giveawayId, participants);

            const participantsMap = await db.giveaway_participants.get(giveawayId + "_map") || {};
            participantsMap[user.id] = user.username
            await db.giveaway_participants.set(giveawayId + "_map", participantsMap);

            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed)
                .setFooter({ text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` });

            await message.edit({ embeds: [newEmbed] });

            await interaction.deferUpdate();

            console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString('en-GB')}] ${user.username} joined giveaway ${giveawayId}`);

        }
    }
};
