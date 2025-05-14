const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Repeats your message')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message to echo')
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;
        
        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        // Check if the user has the required permissions or a whitelisted role
        const member = interaction.guild.members.cache.get(userId);
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to remove the Join To Create channel!', flags: 64 });
        }
        
        // Check if the user has a whitelisted role
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = whitelistedRoles.some(roleId => memberRoles.includes(roleId));
        
        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }
        
        // Get the message content
        const messageContent = interaction.options.getString('message');
        
        // Send the message content in the same channel
        await interaction.channel.send(messageContent);

        // Console Logs
        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the echo command. Message: ${messageContent}`);
        
        // Reply to the user with an ephemeral message confirming the message was sent
        await interaction.reply({ content: 'Your message has been sent!', flags: 64 });
    },
};
