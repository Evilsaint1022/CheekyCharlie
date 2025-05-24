const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-modmail-channel')
        .setDescription('Set the channel where the modmail will be sent.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to set for modmail messages.')
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
            return interaction.reply({ content: 'You do not have permission to set the modmail channel!', flags: 64, });
        }

        const channel = interaction.options.getChannel('channel');

        if ( guildId == "1365657523088134234" || guildId == "1346955021614317619" ) {

            // Save the level-up channel ID to the database
            db.settings.set(`modmailChannelId`, channel.id);

            // Logging the action
            const timestamp = new Date().toLocaleTimeString();
            const datestamp = new Date().toLocaleDateString();
            console.log(`[${timestamp}] [${datestamp}] ${guildName} ${guildId} ${interaction.user.tag} used the set-modmail-channel command to set the channel ID "${channel.id}"`);

            return interaction.reply({ content: `Modmail will now be sent in <#${channel.id}>.`, flags: 64, });
            
        }

        await interaction.reply({ content: "Sorry, your server doesnt support this feature yet." })
        return;
    },
};
