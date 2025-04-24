const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlevelchannel')
        .setDescription('Set the channel where level-up messages will be sent')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send level-up messages')
                .setRequired(true)
        ),
    async execute(interaction) {
        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const settingsDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Settings`);
        const settingsFilePath = path.join(settingsDir, 'channelsettings.json');

        fs.mkdirSync(settingsDir, { recursive: true });

        const member = interaction.guild.members.cache.get(userId);

        let whitelistedRoles = [];
        if (fs.existsSync(settingsFilePath)) {
            const settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
            whitelistedRoles = settingsData.roles || [];
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.roles.cache.some(role => whitelistedRoles.includes(role.id))) {
            return interaction.reply({ content: 'You do not have permission to set the level-up channel!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');

        let settingsData = {};
        if (fs.existsSync(settingsFilePath)) {
            settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        }

        settingsData.LevelChannelId = channel.id;

        fs.writeFileSync(settingsFilePath, JSON.stringify(settingsData, null, 2));

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${guildName} ${guildId} ${interaction.user.tag} used the setlevelchannel to set the channel id "${channel.id}"`);

        return interaction.reply({ content: `Level-up messages will now be sent in <#${channel.id}>.`, flags: 64 });
    },

    sendLevelUpMessage: async function (client, guildId, levelUpMessage, fallbackChannel) {
        const levelSettingsFilePath = path.resolve(__dirname, `../../Utilities/Servers/${guildId}/Level_Settings/Level_Settings.json`);

        let channelId = null;
        if (fs.existsSync(levelSettingsFilePath)) {
            const levelSettingsData = JSON.parse(fs.readFileSync(levelSettingsFilePath, 'utf8'));
            channelId = levelSettingsData.channelId;
        }

        console.log(`Loaded channelId: ${channelId}`);

        let targetChannel = null;

        if (channelId) {
            try {
                targetChannel = await client.channels.fetch(channelId);
                console.log(`Sending level-up message to channel: ${targetChannel.name}`);
            } catch (error) {
                console.error(`Error fetching channel with ID ${channelId}: ${error}`);
            }
        }

        if (!targetChannel) {
            console.log('Using fallback channel (same as the command channel).');
            targetChannel = fallbackChannel;
        }

        if (targetChannel) {
            targetChannel.send(levelUpMessage);
        } else {
            console.error('No valid channel found to send the level-up message!');
        }
    }
};
