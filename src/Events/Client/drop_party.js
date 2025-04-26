const { Events } = require('discord.js');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

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

function getLastDropTime(cooldownFilePath) {
    try {
        if (!fs.existsSync(cooldownFilePath)) return 0;
        const data = JSON.parse(fs.readFileSync(cooldownFilePath, 'utf-8'));
        return data.lastMessageDropTime || 0;
    } catch (error) {
        console.error('[DROP PARTY] Error reading cooldown file:', error);
        return 0;
    }
}

function saveLastDropTime(cooldownFilePath, timestamp) {
    try {
        const data = { lastMessageDropTime: timestamp };
        fs.writeFileSync(cooldownFilePath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error('[DROP PARTY] Error writing to cooldown file:', error);
    }
}

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        const guildName = message.guild.name;
        const guildId = message.guild.id;

        const basePath = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/`);
        const cooldownFilePath = path.join(basePath, 'Settings/Cooldowns/drop_party_cooldown.json');
        const settingsFilePath = path.join(basePath, 'Settings/channelsettings.json');

        // ✅ Ensure cooldown file and directory exist
        try {
            const cooldownDir = path.dirname(cooldownFilePath);
            if (!fs.existsSync(cooldownDir)) {
                fs.mkdirSync(cooldownDir, { recursive: true });
            }
            if (!fs.existsSync(cooldownFilePath)) {
                fs.writeFileSync(cooldownFilePath, JSON.stringify({ lastMessageDropTime: 0 }, null, 4));
            }
        } catch (err) {
            console.error('[DROP PARTY] Error creating cooldown file or directory:', err);
            return;
        }

        // Load the DropPartyChannelId from settings
        let DropPartyChannelId;
        try {
            if (!fs.existsSync(settingsFilePath)) {
                console.log(`[🎉DROP PARTY🎉] ${guildName} ${guildId} Settings file does not exist: ${settingsFilePath}`);
                return;
            }

            const settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
            DropPartyChannelId = settingsData.DropPartyChannelId;

        } catch (err) {
            console.error(`[🎉DROP PARTY🎉] ${guildName} ${guildId} Error loading channel settings:`, err);
            return;
        }

        if (!DropPartyChannelId) {
            return;
        }

        if (message.channel.id !== DropPartyChannelId) {
            return;
        }

        const currentTime = Date.now();
        const lastMessageDropTime = getLastDropTime(cooldownFilePath);

        if (currentTime - lastMessageDropTime < cooldownDuration || isProcessing) {
            return;
        }

        isProcessing = true;

        try {
            const channel = await message.client.channels.fetch(DropPartyChannelId);
            if (channel) {
                console.log(`[🎉DROP PARTY🎉] ${guildName} ${guildId} Sending drop party message...`);

                const dropMessage = await channel.send(
                    '**🎉 A Drop Party Has Started!🎉**\n*Use the **/pick** command to grab your rewards!*'
                );

                console.log(`[🎉DROP PARTY🎉] ${guildName} ${guildId} Drop party message sent.`);
                dropPartyEvent.triggerNewDrop(dropMessage);

                setTimeout(() => {
                    if (dropMessage.deletable) {
                        dropMessage.delete().catch(console.error);
                        dropPartyEvent.clearDrop();
                        console.log(`[🎉DROP PARTY🎉] ${guildName} ${guildId} Drop party message deleted.`);
                    }
                }, 40000);
            } else {
                console.log(`🎉[DROP PARTY🎉] ${guildName} ${guildId} Channel not found or could not be fetched.`);
            }

            saveLastDropTime(cooldownFilePath, currentTime);
        } catch (error) {
            console.error(`[🎉DROP PARTY🎉] ${guildName} ${guildId} Error sending drop party message:`, error);
        } finally {
            isProcessing = false;
        }
    },
};

module.exports.dropPartyEvent = dropPartyEvent;
