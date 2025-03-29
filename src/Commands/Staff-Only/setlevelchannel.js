const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js'); // Import PermissionsBitField for newer discord.js versions
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
        
        // Define the paths for the files
        const levelSettingsDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Level_Settings`);
        const levelSettingsFilePath = path.join(levelSettingsDir, 'Level_Settings.json');
        const whitelistedRolesFilePath = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Whitelisted_Roles/whitelisted_roles.json`);
        
        // Check if the user is an admin or has a whitelisted role
        const member = interaction.guild.members.cache.get(userId);

        // Check if the whitelisted_roles.json exists
        let whitelistedRoles = [];
        if (fs.existsSync(whitelistedRolesFilePath)) {
            whitelistedRoles = JSON.parse(fs.readFileSync(whitelistedRolesFilePath, 'utf8')).roles;
        }

        // Check if the user is an admin or has a whitelisted role
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.roles.cache.some(role => whitelistedRoles.includes(role.id))) {
            return interaction.reply({ content: 'You do not have permission to set the level-up channel!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        
        // Create the Level_Settings directory if it doesn't exist
        if (!fs.existsSync(levelSettingsDir)) {
            fs.mkdirSync(levelSettingsDir, { recursive: true });
        }

        // Prepare the data to be written to the file
        const levelSettingsData = {
            channelId: channel.id,
        };

        // Write the data to Level_Settings.json
        fs.writeFileSync(levelSettingsFilePath, JSON.stringify(levelSettingsData, null, 2));

        // Send a confirmation message
        return interaction.reply({ content: `Level-up messages will now be sent in <#${channel.id}>.`, flags: 64 });
    },

    // Function to send the level-up message (this can be triggered in another part of the bot)
    sendLevelUpMessage: async function(client, guildId, levelUpMessage, fallbackChannel) {
        const levelSettingsFilePath = path.resolve(__dirname, `../../Utilities/Servers/${guildId}/Level_Settings/Level_Settings.json`);

        let channelId = null;
        if (fs.existsSync(levelSettingsFilePath)) {
            const levelSettingsData = JSON.parse(fs.readFileSync(levelSettingsFilePath, 'utf8'));
            channelId = levelSettingsData.channelId;
        }

        console.log(`Loaded channelId: ${channelId}`); // Log the channel ID being loaded

        let targetChannel = null;

        if (channelId) {
            try {
                // Fetch the channel by ID if it exists
                targetChannel = await client.channels.fetch(channelId);
                console.log(`Sending level-up message to channel: ${targetChannel.name}`);
            } catch (error) {
                console.error(`Error fetching channel with ID ${channelId}: ${error}`);
            }
        }

        // If no valid channelId is found, or the channel is invalid, use fallback channel
        if (!targetChannel) {
            console.log('Using fallback channel (same as the command channel).');
            targetChannel = fallbackChannel;
        }

        // Send the message to the determined channel
        if (targetChannel) {
            targetChannel.send(levelUpMessage);
        } else {
            console.error('No valid channel found to send the level-up message!');
        }
    }
};
