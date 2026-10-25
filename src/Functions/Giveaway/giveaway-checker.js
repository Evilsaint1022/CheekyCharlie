const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require("../../Handlers/database");

const CHECK_INTERVAL = 5000;
const GIVEN_ROLE_CHECK_INTERVAL = 10 * 60 * 1000; // Check for expired giveaway given roles every 10 minutes
const GIVEN_ROLE_DURATION = 30 * 24 * 60 * 60 * 1000; // Giveaway given role is removed after 1 month (30 days)

async function checkGiveaways(client) {

    try {
        const allGiveaways = await db.giveaways.all();
        const currentTime = Date.now();

        for (const [giveawayId, giveawayData] of Object.entries(allGiveaways)) {
            
            if (giveawayData.ended) continue;

            
            if (currentTime >= giveawayData.endTime) {
                await endGiveaway(client, giveawayId, giveawayData);
            }

        }

    } catch (error) {}

}

async function endGiveaway(client, giveawayId, giveawayData) {
    try {
        console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] Ending giveaway ${giveawayId}`);

        const guild = client.guilds.cache.get(giveawayData.guildId);
        if (!guild) {
            console.error(`[🎉] [GIVEAWAY] Guild not found: ${giveawayData.guildId}`);
            return;
        }

        const channel = guild.channels.cache.get(giveawayData.channelId);
        if (!channel) {
            console.error(`[🎉] [GIVEAWAY] Channel not found: ${giveawayData.channelId}`);
            return;
        }

        const message = await channel.messages.fetch(giveawayData.messageId).catch(() => null);
        if (!message) {
            console.error(`[🎉] [GIVEAWAY] Message not found: ${giveawayData.messageId}`);
            return;
        }

        const participants = await db.giveaway_participants.get(giveawayId) || [];

        let winnerMentions = '';
        let replyContent = '';
        let winners = [];

        if (participants.length === 0) {
            winnerMentions = `\`There were no Participants\``;
            replyContent = `The giveaway for **${giveawayData.prize}** has ended, but there were no participants!`;

        } else if (participants.length <= giveawayData.winners) {
            winners = participants;
            winnerMentions = winners.map(id => `<@${id}>`).join(', ');
            replyContent = `**🎉 ${winnerMentions} Won the ${giveawayData.prize} Giveaway!!** 🎉`;

        } else {
            
            const participantsCopy = [...participants];

            for (let i = 0; i < giveawayData.winners; i++) {
                const randomIndex = Math.floor(Math.random() * participantsCopy.length);
                winners.push(participantsCopy[randomIndex]);
                participantsCopy.splice(randomIndex, 1);
            }

            winnerMentions = winners.map(id => `<@${id}>`).join(', ');
            replyContent = `🎉 ${winnerMentions} Won the **${giveawayData.prize} Giveaway**!! 🎉`;

        }

        const topRowFromat    = "***──────── 🎉 \`GIVEAWAY RESULTS\` 🎉 ───────***"
        const middle =              `ㅤㅤ · · - ┈┈━━━━ ˚ . 🌿 . ˚ ━━━━┈┈ - · ·`
        const bottomRowFormat = "***───────────────────────────────────────***"

        const space = 'ㅤ'

        const prize = `ㅤㅤㅤ**・Prize: \`${giveawayData.prize}\`**`
        const ended = `ㅤㅤㅤㅤ**・Ended: <t:${Math.floor(giveawayData.endTime / 1000)}:F>**`
        const winner = `ㅤㅤㅤㅤ**・Winner(s): ${winnerMentions}**`

        const endedEmbed = new EmbedBuilder()
            .setTitle(`${topRowFromat}`)
            .setDescription(`\n${space}\n${middle}\n${prize}\n${ended}\n${winner}\n${middle}\n${space}\n${bottomRowFormat}`)
            .setColor('#FFFFFF')

        const originalEmbed = message.embeds[0];

        const components = [];
        if (participants.length > 1 && giveawayData.winners < participants.length) {
            const rerollButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('giveaway_reroll')
                        .setLabel('🔄')
                        .setStyle(ButtonStyle.Primary)
                );
            components.push(rerollButton);
        }

        await message.edit({
            embeds: [endedEmbed],
            components: components
        });

        await message.reply({
            content: replyContent
        });

        giveawayData.ended = true;
        giveawayData.winnerIds = winners;
        await db.giveaways.set(giveawayId, giveawayData);

        await giveWinnerRole(guild, winners);

        console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] Successfully ended giveaway ${giveawayId} with ${participants.length} participants`);
    } catch (error) {
        console.error(`[🎉] [GIVEAWAY] Error ending giveaway ${giveawayId}:`, error);
    }
}

// Gives the configured giveaway given role (set with /giveaway-setup set-given-role) to the winners
async function giveWinnerRole(guild, winnerIds) {
    try {
        if (!winnerIds || winnerIds.length === 0) return;

        const giveawaySettings = await db.giveaway_settings.get(`${guild.id}`) || {};
        const givenRoleId = giveawaySettings.givenRole;
        if (!givenRoleId) return;

        const role = guild.roles.cache.get(givenRoleId) || await guild.roles.fetch(givenRoleId).catch(() => null);
        if (!role) {
            console.error(`[🎉] [GIVEAWAY] Given role not found: ${givenRoleId} in ${guild.name} ${guild.id}`);
            return;
        }

        for (const winnerId of winnerIds) {
            const member = await guild.members.fetch(winnerId).catch(() => null);
            if (!member) continue;

            const givenRoleKey = `${guild.id}_${winnerId}`;
            const existingRecord = await db.giveaway_given_roles.get(givenRoleKey);
            const expiresAt = Date.now() + GIVEN_ROLE_DURATION;

            if (member.roles.cache.has(role.id)) {
                // Winner already has the role from an earlier giveaway, so restart their 1 month timer.
                // If there is no record, the role was given some other way (e.g. manually), so leave it alone.
                if (existingRecord && existingRecord.roleId === role.id) {
                    existingRecord.expiresAt = expiresAt;
                    await db.giveaway_given_roles.set(givenRoleKey, existingRecord);
                }
                continue;
            }

            const added = await member.roles.add(role, 'Giveaway winner')
                .then(() => true)
                .catch(error => {
                    console.error(`[🎉] [GIVEAWAY] Failed to give ${role.name} to ${winnerId}:`, error.message);
                    return false;
                });

            if (!added) continue;

            await db.giveaway_given_roles.set(givenRoleKey, {
                guildId: guild.id,
                userId: winnerId,
                roleId: role.id,
                expiresAt: expiresAt
            });

            console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${guild.name} ${guild.id} - Gave ${role.name} to ${member.user.username} until ${new Date(expiresAt).toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}`);
        }
    } catch (error) {
        console.error(`[🎉] [GIVEAWAY] Error giving winner role in ${guild.id}:`, error);
    }
}

// Removes giveaway given roles that have been held for longer than GIVEN_ROLE_DURATION
async function checkExpiredGivenRoles(client) {
    try {
        const allGivenRoles = await db.giveaway_given_roles.all() || {};
        const currentTime = Date.now();

        for (const [givenRoleKey, record] of Object.entries(allGivenRoles)) {

            if (!record || currentTime < record.expiresAt) continue;

            // Keep the record if the guild isn't available yet (e.g. bot still starting up) and try again next check
            const guild = client.guilds.cache.get(record.guildId);
            if (!guild) continue;

            const member = await guild.members.fetch(record.userId).catch(() => null);
            const role = guild.roles.cache.get(record.roleId) || await guild.roles.fetch(record.roleId).catch(() => null);

            // Member left the server or the role was deleted, so there is nothing to remove
            if (!member || !role || !member.roles.cache.has(role.id)) {
                await db.giveaway_given_roles.delete(givenRoleKey);
                continue;
            }

            const removed = await member.roles.remove(role, 'Giveaway given role expired (1 month)')
                .then(() => true)
                .catch(error => {
                    // Keep the record so it is retried on the next check (e.g. after permissions are fixed)
                    console.error(`[🎉] [GIVEAWAY] Failed to remove expired ${role.name} from ${record.userId}:`, error.message);
                    return false;
                });

            if (!removed) continue;

            await db.giveaway_given_roles.delete(givenRoleKey);

            console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${guild.name} ${guild.id} - Removed expired ${role.name} from ${member.user.username}`);
        }
    } catch (error) {
        console.error(`[🎉] [GIVEAWAY] Error checking expired given roles:`, error);
    }
}

function startGiveawayChecker(client) {

    checkGiveaways(client);

    setInterval(() => {
        checkGiveaways(client);
    }, CHECK_INTERVAL);

    checkExpiredGivenRoles(client);

    setInterval(() => {
        checkExpiredGivenRoles(client);
    }, GIVEN_ROLE_CHECK_INTERVAL);

}

module.exports = async (client) => {
    startGiveawayChecker(client);
};

module.exports.giveWinnerRole = giveWinnerRole;
