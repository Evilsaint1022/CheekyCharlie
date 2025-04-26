const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-join-to-create-vc')
        .setDescription('Remove the configured Join To Create channel'),

    async execute(interaction) {
        
        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const settingsFilePath = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Settings/channelsettings.json`);
        const member = interaction.guild.members.cache.get(userId);

        // Load roles that are allowed to run this command
        let whitelistedRoles = [];
        if (fs.existsSync(settingsFilePath)) {
            const settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
            whitelistedRoles = settingsData.roles || [];
        }

        // Check for permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.roles.cache.some(role => whitelistedRoles.includes(role.id))) {
            return interaction.reply({ content: 'You do not have permission to remove the Join To Create channel!', flags: 64 });
        }

        let settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));

        if ( !("joinToCreateVC" in settingsData) ) {
            return interaction.reply({ content: 'No Join To Create channel was set.', flags: 64 });
        }

        // Load, remove the DropPartyChannelId, and save
        if ( 'joinToCreateVC' in settingsData ) {
            delete settingsData.joinToCreateVC;
            fs.writeFileSync(settingsFilePath, JSON.stringify(settingsData, null, 2));
            return interaction.reply({ content: 'The Join To Create channel has been removed.', flags: 64 });
        } else {
            return interaction.reply({ content: 'No Join To Create channel was set.', flags: 64 });
        }

    }
};
