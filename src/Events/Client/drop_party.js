const { Events, Message } = require('discord.js');
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

async function getLastDropTime(guildKey) {
    try {
        const settingsData = await db.settings.get(guildKey);
        return settingsData?.lastMessageDropTime || 0;
    } catch (error) {
        console.error('[🎉] [DROP PARTY] Error reading cooldown from database:', error);
        return 0;
    }
}

async function saveLastDropTime(guildKey, timestamp) {
    try {
        const settingsData = await db.settings.get(guildKey) || {};
        settingsData.lastMessageDropTime = timestamp;
        await db.settings.set(guildKey, settingsData);
    } catch (error) {
        console.error('[🎉] [DROP PARTY] Error saving cooldown to database:', error);
    }
}

module.exports = {
    name: Events.MessageCreate,

    /**
     * @param {Message} message
    */
    async execute(message) {

        if (message.author.bot) return;
        if (message.channel.isDMBased()) { return; }

        const guildId = message.guild.id;
        const guildName = message.guild.name;
        const guildKey = `${guildId}`;

        // Load the DropPartyChannel from the database
        let DropPartyChannel;
        try {
            const settingsData = await db.settings.get(`${guildKey}`);
            DropPartyChannel = settingsData?.DropPartyChannel;

            if (!DropPartyChannel) {
                return;
            }
        } catch (err) {
            console.error(`[🎉] [DROP PARTY] ${guildName} - Error loading channel settings from database:`, err);
            return;
        }

        if (message.channel.id !== DropPartyChannel) {
            return;
        }

        const currentTime = Date.now();
        const lastMessagesDropSettings = await db.settings.get(`${guildKey}`) || {};
        const lastMessageDropTime = lastMessagesDropSettings.lastMessageDropTime || 0;

        if (currentTime - lastMessageDropTime < cooldownDuration || isProcessing) {
            return;
        }

        isProcessing = true;

        try {
            const channel = await message.client.channels.fetch(DropPartyChannel);
            if (channel) {

                const dropMessage = await channel.send(
                    '**🎉 A Drop Party Has Started!🎉**\n*Use the **!pick** command to grab your rewards!*'
                );

                console.log(`[🎉] [DROP PARTY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Drop party message sent.`);
                dropPartyEvent.triggerNewDrop(dropMessage);

                setTimeout(() => {
                    if (dropMessage.deletable) {
                        dropMessage.delete().catch(console.error);
                        dropPartyEvent.clearDrop();
                        console.log(`[🎉] [DROP PARTY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Drop party message deleted.`);
                    }
                }, 40000);
            } else {
                console.log(`[🎉] [DROP PARTY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Channel not found or could not be fetched.`);
            }

            await saveLastDropTime(guildKey, currentTime);
        } catch (error) {
            console.error(`[🎉] [DROP PARTY] ${guildName} - Error sending drop party message:`, error);
        } finally {
            isProcessing = false;
        }
    },
};

module.exports.dropPartyEvent = dropPartyEvent;
