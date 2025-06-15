const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-ignored-ai-channel')
        .setDescription('Add a channel to the ignored AI channels list.')
        .addChannelOption(option => 
            option.setName('channel')
                  .setDescription('The channel to ignore AI responses in')
        ),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;
        
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const member = interaction.guild.members.cache.get(userId);
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }
        
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = whitelistedRoles.some(roleId => memberRoles.includes(roleId));
        
        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }
        
        const ignoredChannels = await db.settings.get(`${guildName}_${guildId}.ignoredAIChannels`) || [];

        if ( ignoredChannels.includes(channel.id) ) {
            return interaction.reply({ content: `Channel <#${channel.id}> is already ignored for AI responses.`, flags: 64 });
        }

        ignoredChannels.push(channel.id);

        await db.settings.set(`${guildName}_${guildId}.ignoredAIChannels`, ignoredChannels);

        return interaction.reply({
            content: `Channel <#${channel.id}> has been added to the ignored AI channels list.`,
            ephemeral: true
        });
        
    },
};
