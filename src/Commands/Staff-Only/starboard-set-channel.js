const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard-set-channel')
        .setDescription('Set the channel where starboard messages will be sent')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to set for starboard messages')
                .setRequired(true)
        ),

    async execute(interaction) {

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.options.getChannel('channel');

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Please select a valid text channel.', flags: MessageFlags.Ephemeral });
        }

        await db.starboard.set(`${guildName}_${guildId}_starboardChannel`, channel.id);

        await interaction.reply({ content: `Starboard channel set to ${channel.url}.`, flags: MessageFlags.Ephemeral });

    },
};
