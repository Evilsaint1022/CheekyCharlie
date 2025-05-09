const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-level-channel')
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

        const member = interaction.guild.members.cache.get(userId);

        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        // Check if the user has permission
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to set the level-up channel!', flags: 64, });
        }

        const channel = interaction.options.getChannel('channel');

        // Save the level-up channel ID to the database
        db.settings.set(`${guildName}_${guildId}_levelChannelId`, channel.id);

        // Logging the action
        const timestamp = new Date().toLocaleTimeString();
        const datestamp = new Date().toLocaleDateString();
        console.log(`[${timestamp}] [${datestamp}] ${guildName} ${guildId} ${interaction.user.tag} used the set-level-channel command to set the channel ID "${channel.id}"`);

        return interaction.reply({ content: `Level-up messages will now be sent in <#${channel.id}>.`, flags: 64, });
    },

    sendLevelUpMessage: async function (client, guildId, levelUpMessage, fallbackChannel) {
        // Fetch the level-up channel ID from the database
        const channelId = await db.settings.get(`${guildName}_${guildId}.levelChannelId`);

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
