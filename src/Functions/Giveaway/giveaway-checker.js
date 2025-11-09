const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require("../../Handlers/database");

const CHECK_INTERVAL = 5000;

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
        console.log(`[🎉] [GIVEAWAY] Ending giveaway ${giveawayId}`);

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

        const topRowFromat    = "**─────────── 🌿GIVEAWAY🌿 ──────────**"
        const middle =              `ㅤㅤ · · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`
        const bottomRowFormat = "**───────────────────────────────────────**"

        const space = 'ㅤ'

        const prize = `ㅤㅤ**・Prize:** ${giveawayData.prize}`
        const ended = `ㅤㅤ**・Ended:** <t:${Math.floor(giveawayData.endTime / 1000)}:F>`
        const winner = `ㅤㅤ**・Winner(s):** ${winnerMentions}`

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

        console.log(`[🎉] [GIVEAWAY] Successfully ended giveaway ${giveawayId} with ${participants.length} participants`);
    } catch (error) {
        console.error(`[🎉] [GIVEAWAY] Error ending giveaway ${giveawayId}:`, error);
    }
}

function startGiveawayChecker(client) {

    checkGiveaways(client);
    
    setInterval(() => {
        checkGiveaways(client);
    }, CHECK_INTERVAL);

}

module.exports = async (client) => {
    startGiveawayChecker(client);
};
