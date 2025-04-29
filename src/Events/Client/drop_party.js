const { Events } = require('discord.js');
const { EventEmitter } = require('events');
const db = require('../../Handlers/database'); // Import the database module

// EventEmitter instance to manage drop party events
const dropPartyEvent = new EventEmitter();

// Add methods to the EventEmitter for easier usage
dropPartyEvent.triggerNewDrop = function (message) {
    this.dropPartyData = { message };
    this.emit('newDrop', this.dropPartyData);
};

dropPartyEvent.clearDrop = function () {
    this.dropPartyData = null;
    this.emit('clearDrop');
};

const cooldownDuration = 10 * 60 * 1000; // 10 minutes
let isProcessing = false; // Lock to prevent concurrent execution

async function getLastDropTime(guildId) {
    try {
        const cooldownData = await db.config.get(`${guildId}_dropPartyCooldown`);
        return cooldownData?.lastMessageDropTime || 0;
    } catch (error) {
        console.error('[DROP PARTY] Error reading cooldown from database:', error);
        return 0;
    }
}

async function saveLastDropTime(guildId, timestamp) {
    try {
        await db.config.set(`${guildId}_dropPartyCooldown`, { lastMessageDropTime: timestamp });
    } catch (error) {
        console.error('[DROP PARTY] Error saving cooldown to database:', error);
    }
}

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {

        if (message.author.bot) return;

        const guildId = message.guild.id;

        // Load the DropPartyChannelId from the database
        let DropPartyChannelId;
        try {
            const settingsData = await db.config.get(`${guildId}_channelSettings`);
            DropPartyChannelId = settingsData?.DropPartyChannelId;

            if (!DropPartyChannelId) {
                console.log(`[🎉DROP PARTY🎉] ${guildId} No DropPartyChannelId found in database.`);
                return;
            }
        } catch (err) {
            console.error(`[🎉DROP PARTY🎉] ${guildId} Error loading channel settings from database:`, err);
            return;
        }

        if (message.channel.id !== DropPartyChannelId) {
            return;
        }

        const currentTime = Date.now();
        const lastMessageDropTime = await getLastDropTime(guildId);

        if (currentTime - lastMessageDropTime < cooldownDuration || isProcessing) {
            return;
        }

        isProcessing = true;

        try {
            const channel = await message.client.channels.fetch(DropPartyChannelId);
            if (channel) {
                console.log(`[🎉DROP PARTY🎉] ${guildId} Sending drop party message...`);

                const dropMessage = await channel.send(
                    '**🎉 A Drop Party Has Started!🎉**\n*Use the **/pick** command to grab your rewards!*'
                );

                console.log(`[🎉DROP PARTY🎉] ${guildId} Drop party message sent.`);
                dropPartyEvent.triggerNewDrop(dropMessage);

                setTimeout(() => {
                    if (dropMessage.deletable) {
                        dropMessage.delete().catch(console.error);
                        dropPartyEvent.clearDrop();
                        console.log(`[🎉DROP PARTY🎉] ${guildId} Drop party message deleted.`);
                    }
                }, 40000);
            } else {
                console.log(`🎉[DROP PARTY🎉] ${guildId} Channel not found or could not be fetched.`);
            }

            await saveLastDropTime(guildId, currentTime);
        } catch (error) {
            console.error(`[🎉DROP PARTY🎉] ${guildId} Error sending drop party message:`, error);
        } finally {
            isProcessing = false;
        }
    },
};

module.exports.dropPartyEvent = dropPartyEvent;
